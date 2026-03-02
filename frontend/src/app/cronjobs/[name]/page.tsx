"use client";

import { Fragment } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRefreshInterval } from "@/lib/refresh-context";
import { useNamespace } from "@/lib/namespace-context";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
    manual: boolean;
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
    lastRunTime: string | null;
    lastRunType: "manual" | "scheduled";
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
                {loading ? "Loading..." : "Load Logs"}
            </Button>
            {(logs.length > 0 || done) && (
                <pre className="bg-black/60 text-green-400 text-xs font-mono rounded-lg p-4 overflow-auto max-h-60 border border-border">
                    {logs.length > 0 ? logs.join("\n") : "No logs available"}
                </pre>
            )}
        </div>
    );
}

function statusBadge(status: Job["status"]) {
    if (status === "succeeded")
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">✓ Succeeded</Badge>;
    if (status === "failed")
        return <Badge variant="destructive">✗ Failed</Badge>;
    return <Badge variant="secondary" className="animate-pulse">⟳ Running</Badge>;
}

export default function CronJobDetailPage() {
    const { name } = useParams<{ name: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { namespace } = useNamespace();
    const [selectedPod, setSelectedPod] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editScheduleTarget, setEditScheduleTarget] = useState<string | null>(null);
    const [newSchedule, setNewSchedule] = useState("");
    const [editError, setEditError] = useState<string | null>(null);

    const refetchInterval = useRefreshInterval();

    const { data, isLoading, error } = useQuery<CronJobDetail>({
        queryKey: ["cronjob", namespace, name],
        queryFn: async () => {
            const res = await fetch(`/api/cronjobs/${name}?namespace=${namespace}`);
            if (!res.ok) throw new Error("CronJob not found");
            return res.json();
        },
        refetchInterval,
    });

    const triggerMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/cronjobs/${name}/trigger`, { method: "POST" });
            if (!res.ok) throw new Error("Trigger failed");
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
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjob", namespace, name] }),
    });

    const editScheduleMutation = useMutation({
        mutationFn: async (schedule: string) => {
            setEditError(null);
            const res = await fetch(`/api/cronjobs/${name}?namespace=${namespace}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ schedule }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update schedule");
            return data;
        },
        onError: (err: any) => setEditError(err.message),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cronjob", namespace, name] });
            setEditScheduleTarget(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/cronjobs/${name}?namespace=${namespace}`, { method: "DELETE" });
        },
        onSuccess: () => router.push("/"),
    });

    if (isLoading)
        return <div className="text-muted-foreground animate-pulse p-10">Loading...</div>;
    if (error || !data)
        return <div className="text-destructive p-10">⚠️ CronJob not found</div>;

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button onClick={() => router.push("/")} className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1">
                        ← KronDog
                    </button>
                    <h2 className="text-2xl font-semibold font-mono">{data.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{data.schedule}</code>
                        {data.suspend ? (
                            <Badge variant="secondary">⏸ Suspended</Badge>
                        ) : (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">▶ Active</Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
                        ▶ Run Now
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => suspendMutation.mutate(!data.suspend)} disabled={suspendMutation.isPending}>
                        {data.suspend ? "▶ Resume" : "⏸ Suspend"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setEditScheduleTarget(data.schedule);
                            setNewSchedule(data.schedule);
                        }}
                    >
                        ✏️ Edit Schedule
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteMutation.isPending}
                    >
                        🗑 Delete
                    </Button>

                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-destructive flex items-center gap-2">
                                    ⚠️ Delete CronJob
                                </DialogTitle>
                                <DialogDescription className="text-sm pt-2">
                                    You are about to permanently delete the CronJob{" "}
                                    <span className="font-mono font-bold text-foreground">"{name}"</span>.{" "}
                                    This action is <strong className="text-destructive">irreversible</strong> and will also remove all associated Jobs and their logs.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setDeleteDialogOpen(false);
                                        deleteMutation.mutate();
                                    }}
                                >
                                    🗑 Yes, delete permanently
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={!!editScheduleTarget} onOpenChange={(open) => {
                        if (!open) {
                            setEditScheduleTarget(null);
                            setEditError(null);
                        }
                    }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Schedule</DialogTitle>
                                <DialogDescription>
                                    Update the cron schedule expression for{" "}
                                    <span className="font-mono font-bold text-foreground">
                                        {name}
                                    </span>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Input
                                    value={newSchedule}
                                    onChange={(e) => setNewSchedule(e.target.value)}
                                    placeholder="*/5 * * * *"
                                    className="font-mono"
                                />
                                {editError && (
                                    <p className="text-sm text-destructive mt-2 break-all">{editError}</p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditScheduleTarget(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (newSchedule) editScheduleMutation.mutate(newSchedule);
                                    }}
                                    disabled={editScheduleMutation.isPending || !newSchedule}
                                >
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Last Run
                    </p>
                    <div className="flex items-center gap-3">
                        <p className="text-lg font-mono font-bold">
                            {data.lastRunTime ? formatDate(data.lastRunTime) : "Never"}
                        </p>
                        {data.lastRunTime && (
                            <Badge variant="outline" className="text-xs bg-background">
                                {data.lastRunType === "manual" ? "✋ Manual" : "⏱ Scheduled"}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Active Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-bold ${data.active > 0 ? "text-yellow-400" : ""}`}>{data.active}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Succeeded</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-400">
                            {data.jobs.filter((j) => j.status === "succeeded").length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1 pt-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Failures</CardTitle>
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
                    <CardTitle className="text-base">Job History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40">
                                <TableHead>Job Name</TableHead>
                                <TableHead>Result</TableHead>
                                <TableHead>Trigger</TableHead>
                                <TableHead>Started</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Logs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.jobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No Jobs executed yet
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
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                {job.manual ? "✋ Manual" : "⏱ Scheduled"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                                            {job.startTime ? formatDate(job.startTime) : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {job.duration != null ? `${job.duration}s` : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="text-xs">
                                                {selectedPod === job.name ? "▲ Close" : "▼ Logs"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {selectedPod === job.name && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="bg-muted/10">
                                                {job.podName
                                                    ? <LogViewer podName={job.podName} />
                                                    : <p className="text-xs text-muted-foreground py-2">Pod no longer available (already removed from the cluster)</p>
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
