"use client";

import { Fragment } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useState } from "react";

type Job = {
    name: string;
    podName: string | null;
    status: "succeeded" | "failed" | "running";
    startTime: string | null;
    completionTime: string | null;
    duration: number | null;
};

type CronJobDetail = {
    name: string;
    schedule: string;
    suspend: boolean;
    active: number;
    lastScheduleTime: string | null;
    jobs: Job[];
};

function LogViewer({ podName }: { podName: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const loadLogs = () => {
        setLogs([]);
        setDone(false);
        setLoading(true);
        const es = new EventSource(`/api/pods/${podName}/logs`);
        es.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.done || data.error) {
                es.close();
                setLoading(false);
                setDone(true);
            } else if (data.line) {
                setLogs((prev) => [...prev, data.line]);
            }
        };
        es.onerror = () => {
            es.close();
            setLoading(false);
        };
    };

    return (
        <div className="space-y-2">
            <Button size="sm" onClick={loadLogs} disabled={loading}>
                {loading ? "Caricamento..." : "Carica log"}
            </Button>
            {(logs.length > 0 || done) && (
                <pre className="bg-black/60 text-green-400 text-xs font-mono rounded-lg p-4 overflow-auto max-h-60 border border-border">
                    {logs.length > 0 ? logs.join("\n") : "Nessun log disponibile"}
                </pre>
            )}
        </div>
    );
}

function statusBadge(status: Job["status"]) {
    if (status === "succeeded")
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">✓ Successo</Badge>;
    if (status === "failed")
        return <Badge variant="destructive">✗ Fallito</Badge>;
    return <Badge variant="secondary" className="animate-pulse">⟳ In corso</Badge>;
}

export default function CronJobDetailPage() {
    const { name } = useParams<{ name: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedPod, setSelectedPod] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery<CronJobDetail>({
        queryKey: ["cronjob", name],
        queryFn: async () => {
            const res = await fetch(`/api/cronjobs/${name}`);
            if (!res.ok) throw new Error("CronJob non trovato");
            return res.json();
        },
    });

    const triggerMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/cronjobs/${name}/trigger`, { method: "POST" });
            if (!res.ok) throw new Error("Trigger fallito");
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjob", name] }),
    });

    const suspendMutation = useMutation({
        mutationFn: async (suspend: boolean) => {
            await fetch(`/api/cronjobs/${name}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ suspend }),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjob", name] }),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/cronjobs/${name}`, { method: "DELETE" });
        },
        onSuccess: () => router.push("/"),
    });

    if (isLoading)
        return <div className="text-muted-foreground animate-pulse p-10">Caricamento...</div>;
    if (error || !data)
        return <div className="text-destructive p-10">⚠️ CronJob non trovato</div>;

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button onClick={() => router.push("/")} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
                        ← Dashboard
                    </button>
                    <h2 className="text-2xl font-semibold font-mono">{data.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{data.schedule}</code>
                        {data.suspend ? (
                            <Badge variant="secondary">⏸ Sospeso</Badge>
                        ) : (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">▶ Attivo</Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
                        ▶ Esegui ora
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => suspendMutation.mutate(!data.suspend)} disabled={suspendMutation.isPending}>
                        {data.suspend ? "▶ Riprendi" : "⏸ Sospendi"}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { if (confirm(`Eliminare "${name}"?`)) deleteMutation.mutate(); }}
                        disabled={deleteMutation.isPending}
                    >
                        🗑 Elimina
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Job attivi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-bold ${data.active > 0 ? "text-yellow-400" : ""}`}>{data.active}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Successi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-400">
                            {data.jobs.filter((j) => j.status === "succeeded").length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Fallimenti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-400">
                            {data.jobs.filter((j) => j.status === "failed").length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Job history */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">History dei Job</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Nome Job</TableHead>
                                <TableHead>Esito</TableHead>
                                <TableHead>Avvio</TableHead>
                                <TableHead>Durata</TableHead>
                                <TableHead>Log</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.jobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        Nessun Job ancora eseguito
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.jobs.map((job) => (
                                <Fragment key={job.name}>
                                    <TableRow
                                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                                        onClick={() => setSelectedPod(selectedPod === job.name ? null : job.name)}
                                    >
                                        <TableCell className="font-mono text-xs">{job.name}</TableCell>
                                        <TableCell>{statusBadge(job.status)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                                            {job.startTime ? new Date(job.startTime).toLocaleString("it-IT") : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {job.duration != null ? `${job.duration}s` : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="text-xs">
                                                {selectedPod === job.name ? "▲ Chiudi" : "▼ Log"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {selectedPod === job.name && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="bg-muted/10">
                                                {job.podName
                                                    ? <LogViewer podName={job.podName} />
                                                    : <p className="text-xs text-muted-foreground py-2">Pod non più disponibile (già rimosso dal cluster)</p>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
