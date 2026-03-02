import { NextResponse } from "next/server";
import { getBatchV1Api } from "@/lib/k8s";

const NAMESPACE = process.env.K8S_NAMESPACE ?? "default";

type Params = { params: Promise<{ name: string }> };

// GET /api/cronjobs/[name] — dettaglio CronJob
export async function GET(_req: Request, { params }: Params) {
    const { name } = await params;
    try {
        const api = getBatchV1Api();
        const cj = await api.readNamespacedCronJob({ name, namespace: NAMESPACE });
        // Lista dei Job associati
        const jobs = await api.listNamespacedJob({ namespace: NAMESPACE });
        const relatedJobs = jobs.items
            .filter((j) => j.metadata?.ownerReferences?.some((r) => r.name === name))
            .map((j) => ({
                name: j.metadata?.name,
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
            }));

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
