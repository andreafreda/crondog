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

        // Suffisso breve: K8s limita i nomi a 63 caratteri
        const suffix = Date.now().toString().slice(-8);
        const jobName = `${name}-manual-${suffix}`.slice(0, 63);

        const result = await api.createNamespacedJob({
            namespace: NAMESPACE,
            body: {
                apiVersion: "batch/v1",
                kind: "Job",
                metadata: {
                    name: jobName,
                    namespace: NAMESPACE,
                    // Label che permette di filtrare questo job nella detail page
                    labels: { "cronjob-name": name },
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
