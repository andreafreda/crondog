import { NextResponse } from "next/server";
import { getBatchV1Api } from "@/lib/k8s";

const NAMESPACE = process.env.K8S_NAMESPACE ?? "default";

type Params = { params: Promise<{ name: string }> };

// POST /api/cronjobs/[name]/trigger — crea un Job manuale dal CronJob
export async function POST(_req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const api = getBatchV1Api();
        const cj = await api.readNamespacedCronJob({ name, namespace: NAMESPACE });

        const jobName = `${name}-manual-${Date.now()}`;
        const result = await api.createNamespacedJob({
            namespace: NAMESPACE,
            body: {
                apiVersion: "batch/v1",
                kind: "Job",
                metadata: {
                    name: jobName,
                    namespace: NAMESPACE,
                    annotations: { "cronjob-manager/triggered-by": "manual" },
                },
                spec: cj.spec?.jobTemplate.spec,
            },
        });
        return NextResponse.json({ jobName: result.metadata?.name }, { status: 201 });
    } catch (err) {
        console.error(`[POST /api/cronjobs/${name}/trigger]`, err);
        return NextResponse.json({ error: "Impossibile avviare il Job" }, { status: 500 });
    }
}
