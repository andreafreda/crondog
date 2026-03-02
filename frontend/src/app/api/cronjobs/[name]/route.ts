import { NextResponse } from "next/server";
import { getBatchV1Api, getCoreV1Api } from "@/lib/k8s";

type Params = { params: Promise<{ name: string }> };

// GET /api/cronjobs/[name] — CronJob detail + job history with podName
export async function GET(req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const { searchParams } = new URL(req.url);
        const namespace = searchParams.get("namespace") || "default";

        const api = getBatchV1Api();
        const coreApi = getCoreV1Api();

        const cj = await api.readNamespacedCronJob({ name, namespace });

        // Retrieve Jobs via ownerReference (automatic) and via label (manual)
        const [allJobs, labelJobs] = await Promise.all([
            api.listNamespacedJob({ namespace }),
            api.listNamespacedJob({
                namespace,
                labelSelector: `cronjob-name=${name}`,
            }),
        ]);

        // Merge the two sets removing duplicates by name
        const seen = new Set<string>();
        const merged = [...allJobs.items, ...labelJobs.items].filter((j) => {
            const jobName = j.metadata?.name ?? "";
            if (seen.has(jobName)) return false;
            seen.add(jobName);
            // Keep only Jobs that belong to this CronJob
            const byOwner = j.metadata?.ownerReferences?.some((r) => r.name === name);
            const byLabel = j.metadata?.labels?.["cronjob-name"] === name;
            return byOwner || byLabel;
        });

        const relatedJobs = await Promise.all(
            merged.map(async (j) => {
                let podName: string | null = null;
                try {
                    const pods = await coreApi.listNamespacedPod({
                        namespace,
                        labelSelector: `job-name=${j.metadata?.name}`,
                    });
                    podName = pods.items[0]?.metadata?.name ?? null;
                } catch {
                    // Pod already removed
                }

                return {
                    name: j.metadata?.name,
                    podName,
                    manual: !!j.metadata?.annotations?.["cronjob-manager/triggered-by"],
                    status: j.status?.succeeded
                        ? "succeeded"
                        : j.status?.failed
                            ? "failed"
                            : "running",
                    startTime: j.status?.startTime ?? null,
                    completionTime: j.status?.completionTime ?? null,
                    duration:
                        j.status?.startTime && j.status?.completionTime
                            ? Math.round(
                                (new Date(j.status.completionTime).getTime() -
                                    new Date(j.status.startTime).getTime()) /
                                1000
                            )
                            : null,
                };
            })
        );

        // Sort: most recent first
        relatedJobs.sort((a, b) =>
            (b.startTime ? new Date(b.startTime).getTime() : 0) -
            (a.startTime ? new Date(a.startTime).getTime() : 0)
        );

        // Count all running jobs (automatic + manual)
        const activeCount = relatedJobs.filter((j) => j.status === "running").length;

        // Determine true last run attributes based on the latest mapped job
        const latestJob = relatedJobs.length > 0 ? relatedJobs[0] : null;
        const nativeScheduleTime = cj.status?.lastScheduleTime;
        const lastJobTime = latestJob?.startTime;

        return NextResponse.json({
            name: cj.metadata?.name,
            schedule: cj.spec?.schedule,
            suspend: cj.spec?.suspend ?? false,
            lastScheduleTime: nativeScheduleTime ?? null,
            lastRunTime: lastJobTime || nativeScheduleTime || null,
            lastRunType: latestJob?.manual ? "manual" : "scheduled",
            active: activeCount,
            jobs: relatedJobs,
        });
    } catch (err) {
        console.error(`[GET /api/cronjobs/${name}]`, err);
        return NextResponse.json({ error: "CronJob not found" }, { status: 404 });
    }
}

// PATCH /api/cronjobs/[name] — modify schedule or suspend
export async function PATCH(req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const { searchParams } = new URL(req.url);
        const namespace = searchParams.get("namespace") || "default";
        const body = await req.json();
        const api = getBatchV1Api();

        // Read current CronJob, modify, then replace (avoids patch content-type issues)
        const current = await api.readNamespacedCronJob({ name, namespace });
        if (body.suspend !== undefined) current.spec!.suspend = body.suspend;
        if (body.schedule !== undefined) current.spec!.schedule = body.schedule;

        const result = await api.replaceNamespacedCronJob({
            name,
            namespace,
            body: current,
        });
        return NextResponse.json(result);
    } catch (err: any) {
        console.error(`[PATCH /api/cronjobs/${name}]`, err);
        let errorMessage = "Unable to update CronJob";
        try {
            if (err.body) {
                const parsedBody = typeof err.body === "string" ? JSON.parse(err.body) : err.body;
                errorMessage = parsedBody.message || errorMessage;
            } else if (err.message) {
                errorMessage = err.message;
            }
        } catch (e) {
            errorMessage = err.body ? String(err.body) : err.message || errorMessage;
        }
        return NextResponse.json({ error: errorMessage }, { status: err.statusCode || 500 });
    }
}

// DELETE /api/cronjobs/[name]
export async function DELETE(req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const { searchParams } = new URL(req.url);
        const namespace = searchParams.get("namespace") || "default";

        const api = getBatchV1Api();
        await api.deleteNamespacedCronJob({ name, namespace });
        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error(`[DELETE /api/cronjobs/${name}]`, err);
        return NextResponse.json({ error: "Unable to delete CronJob" }, { status: 500 });
    }
}
