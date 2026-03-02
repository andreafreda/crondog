import { NextResponse } from "next/server";
import { getBatchV1Api } from "@/lib/k8s";

// GET /api/cronjobs — list all CronJobs
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get("namespace") || "default";

        const api = getBatchV1Api();
        // Fetch CronJobs and Jobs in parallel for accurate "Last Run" parsing
        const [cronJobsRes, jobsRes] = await Promise.all([
            api.listNamespacedCronJob({ namespace }),
            api.listNamespacedJob({ namespace })
        ]);

        // Group Jobs by their parent CronJob explicitly
        // using kubernetes ownerReferences or cronjob-name label
        const jobsByCronJob: Record<string, any[]> = {};
        for (const job of jobsRes.items) {
            const cronJobName = job.metadata?.ownerReferences?.find(r => r.kind === "CronJob")?.name
                || job.metadata?.labels?.["cronjob-name"];

            if (cronJobName) {
                if (!jobsByCronJob[cronJobName]) jobsByCronJob[cronJobName] = [];
                jobsByCronJob[cronJobName].push(job);
            }
        }

        const cronjobs = cronJobsRes.items.map((cj) => {
            const name = cj.metadata?.name || "";
            const relatedJobs = jobsByCronJob[name] || [];

            // Sort by start time descending to find the most recent
            relatedJobs.sort((a, b) =>
                (b.status?.startTime ? new Date(b.status.startTime).getTime() : 0) -
                (a.status?.startTime ? new Date(a.status.startTime).getTime() : 0)
            );

            const latestJob = relatedJobs[0];
            const isManual = !!latestJob?.metadata?.annotations?.["cronjob-manager/triggered-by"];

            const nativeScheduleTime = cj.status?.lastScheduleTime;
            const lastJobTime = latestJob?.status?.startTime;

            return {
                name,
                namespace: cj.metadata?.namespace,
                schedule: cj.spec?.schedule,
                suspend: cj.spec?.suspend ?? false,
                lastScheduleTime: nativeScheduleTime ?? null,
                // True last run: the actual Job start time or fallback to the schedule time
                lastRunTime: lastJobTime || nativeScheduleTime || null,
                lastRunType: isManual ? "manual" : "scheduled",
                active: cj.status?.active?.length ?? 0,
                creationTimestamp: cj.metadata?.creationTimestamp ?? null,
            };
        });
        return NextResponse.json(cronjobs);
    } catch (err) {
        console.error("[GET /api/cronjobs]", err);
        return NextResponse.json({ error: "Unable to retrieve CronJobs" }, { status: 500 });
    }
}

// POST /api/cronjobs — create a new CronJob
export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const namespace = searchParams.get("namespace") || "default";

        const body = await request.json();
        const api = getBatchV1Api();
        const result = await api.createNamespacedCronJob({
            namespace,
            body: {
                apiVersion: "batch/v1",
                kind: "CronJob",
                metadata: { name: body.name, namespace },
                spec: {
                    schedule: body.schedule,
                    suspend: false,
                    concurrencyPolicy: "Forbid",
                    successfulJobsHistoryLimit: 5,
                    failedJobsHistoryLimit: 3,
                    jobTemplate: {
                        spec: {
                            backoffLimit: 0,
                            template: {
                                spec: {
                                    restartPolicy: "Never",
                                    containers: [
                                        {
                                            name: body.name,
                                            image: body.image,
                                            imagePullPolicy: "Never",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        });
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error("[POST /api/cronjobs]", err);
        return NextResponse.json({ error: "Unable to create CronJob" }, { status: 500 });
    }
}
