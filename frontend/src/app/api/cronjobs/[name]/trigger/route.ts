import { NextResponse } from "next/server";
import { getBatchV1Api } from "@/lib/k8s";

type Params = { params: Promise<{ name: string }> };

// POST /api/cronjobs/[name]/trigger — create a manual Job from the CronJob
export async function POST(req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const { searchParams } = new URL(req.url);
        const namespace = searchParams.get("namespace") || "default";

        const api = getBatchV1Api();
        const cj = await api.readNamespacedCronJob({ name, namespace });

        // Short suffix: K8s limits names to 63 characters
        const suffix = Date.now().toString().slice(-8);
        const jobName = `${name}-manual-${suffix}`.slice(0, 63);

        const result = await api.createNamespacedJob({
            namespace,
            body: {
                apiVersion: "batch/v1",
                kind: "Job",
                metadata: {
                    name: jobName,
                    namespace,
                    // Label that allows filtering this job in the detail page
                    labels: { "cronjob-name": name },
                    annotations: { "cronjob-manager/triggered-by": "manual" },
                },
                spec: cj.spec?.jobTemplate.spec,
            },
        });
        return NextResponse.json({ jobName: result.metadata?.name }, { status: 201 });
    } catch (err) {
        console.error(`[POST /api/cronjobs/${name}/trigger]`, err);
        return NextResponse.json({ error: "Unable to start the Job" }, { status: 500 });
    }
}
