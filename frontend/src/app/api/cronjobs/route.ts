import { NextResponse } from "next/server";
import { getBatchV1Api } from "@/lib/k8s";

const NAMESPACE = process.env.K8S_NAMESPACE ?? "default";

// GET /api/cronjobs — lista tutti i CronJob
export async function GET() {
    try {
        const api = getBatchV1Api();
        const res = await api.listNamespacedCronJob({ namespace: NAMESPACE });
        const cronjobs = res.items.map((cj) => ({
            name: cj.metadata?.name,
            namespace: cj.metadata?.namespace,
            schedule: cj.spec?.schedule,
            suspend: cj.spec?.suspend ?? false,
            lastScheduleTime: cj.status?.lastScheduleTime ?? null,
            active: cj.status?.active?.length ?? 0,
            creationTimestamp: cj.metadata?.creationTimestamp ?? null,
        }));
        return NextResponse.json(cronjobs);
    } catch (err) {
        console.error("[GET /api/cronjobs]", err);
        return NextResponse.json({ error: "Impossibile recuperare i CronJob" }, { status: 500 });
    }
}

// POST /api/cronjobs — crea un nuovo CronJob
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const api = getBatchV1Api();
        const result = await api.createNamespacedCronJob({
            namespace: NAMESPACE,
            body: {
                apiVersion: "batch/v1",
                kind: "CronJob",
                metadata: { name: body.name, namespace: NAMESPACE },
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
        return NextResponse.json({ error: "Impossibile creare il CronJob" }, { status: 500 });
    }
}
