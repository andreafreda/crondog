import { NextResponse } from "next/server";
import { getBatchV1Api, getCoreV1Api } from "@/lib/k8s";

const NAMESPACE = process.env.K8S_NAMESPACE ?? "default";

type Params = { params: Promise<{ name: string }> };

// GET /api/cronjobs/[name] — dettaglio CronJob + history job con podName
export async function GET(_req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const api = getBatchV1Api();
        const coreApi = getCoreV1Api();

        const cj = await api.readNamespacedCronJob({ name, namespace: NAMESPACE });

        // Recupera Job via ownerReference (automatici) e via label (manuali)
        const [allJobs, labelJobs] = await Promise.all([
            api.listNamespacedJob({ namespace: NAMESPACE }),
            api.listNamespacedJob({
                namespace: NAMESPACE,
                labelSelector: `cronjob-name=${name}`,
            }),
        ]);

        // Unisce i due set rimuovendo duplicati per nome
        const seen = new Set<string>();
        const merged = [...allJobs.items, ...labelJobs.items].filter((j) => {
            const jobName = j.metadata?.name ?? "";
            if (seen.has(jobName)) return false;
            seen.add(jobName);
            // Tieni solo Job che appartengono a questo CronJob
            const byOwner = j.metadata?.ownerReferences?.some((r) => r.name === name);
            const byLabel = j.metadata?.labels?.["cronjob-name"] === name;
            return byOwner || byLabel;
        });

        const relatedJobs = await Promise.all(
            merged.map(async (j) => {
                let podName: string | null = null;
                try {
                    const pods = await coreApi.listNamespacedPod({
                        namespace: NAMESPACE,
                        labelSelector: `job-name=${j.metadata?.name}`,
                    });
                    podName = pods.items[0]?.metadata?.name ?? null;
                } catch {
                    // Pod già rimosso
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

        // Ordina dal più recente
        relatedJobs.sort((a, b) =>
            (b.startTime ? new Date(b.startTime).getTime() : 0) -
            (a.startTime ? new Date(a.startTime).getTime() : 0)
        );

        return NextResponse.json({
            name: cj.metadata?.name,
            schedule: cj.spec?.schedule,
            suspend: cj.spec?.suspend ?? false,
            lastScheduleTime: cj.status?.lastScheduleTime ?? null,
            active: cj.status?.active?.length ?? 0,
            jobs: relatedJobs,
        });
    } catch (err) {
        console.error(`[GET /api/cronjobs/${name}]`, err);
        return NextResponse.json({ error: "CronJob non trovato" }, { status: 404 });
    }
}

// PATCH /api/cronjobs/[name] — modifica schedule o suspend
export async function PATCH(req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const body = await req.json();
        const api = getBatchV1Api();
        const patch: Record<string, unknown> = { spec: {} };
        if (body.suspend !== undefined) (patch.spec as Record<string, unknown>).suspend = body.suspend;
        if (body.schedule !== undefined) (patch.spec as Record<string, unknown>).schedule = body.schedule;

        const result = await api.patchNamespacedCronJob({
            name,
            namespace: NAMESPACE,
            body: patch,
        });
        return NextResponse.json(result);
    } catch (err) {
        console.error(`[PATCH /api/cronjobs/${name}]`, err);
        return NextResponse.json({ error: "Impossibile aggiornare il CronJob" }, { status: 500 });
    }
}

// DELETE /api/cronjobs/[name]
export async function DELETE(_req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const api = getBatchV1Api();
        await api.deleteNamespacedCronJob({ name, namespace: NAMESPACE });
        return NextResponse.json({ deleted: true });
    } catch (err) {
        console.error(`[DELETE /api/cronjobs/${name}]`, err);
        return NextResponse.json({ error: "Impossibile eliminare il CronJob" }, { status: 500 });
    }
}
