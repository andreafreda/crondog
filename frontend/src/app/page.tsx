"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRefreshInterval } from "@/lib/refresh-context";
import { useNamespace } from "@/lib/namespace-context";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CronJob = {
  name: string;
  schedule: string;
  suspend: boolean;
  active: number;
  lastScheduleTime: string | null;
  lastRunTime: string | null;
  lastRunType: "manual" | "scheduled";
};

async function fetchCronJobs(namespace: string): Promise<CronJob[]> {
  const res = await fetch(`/api/cronjobs?namespace=${namespace}`);
  if (!res.ok) throw new Error("Failed to load CronJobs");
  return res.json();
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const refetchInterval = useRefreshInterval();
  const { namespace } = useNamespace();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editScheduleTarget, setEditScheduleTarget] = useState<{ name: string; schedule: string } | null>(null);
  const [newSchedule, setNewSchedule] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const { data: cronjobs, isLoading, error } = useQuery({
    queryKey: ["cronjobs", namespace],
    queryFn: () => fetchCronJobs(namespace),
    refetchInterval,
  });

  const triggerMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/cronjobs/${name}/trigger?namespace=${namespace}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger CronJob");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cronjobs", namespace] });
    },
  });

  const editScheduleMutation = useMutation({
    mutationFn: async ({ name, schedule }: { name: string; schedule: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ["cronjobs", namespace] });
      setEditScheduleTarget(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ name, suspend }: { name: string; suspend: boolean }) => {
      const res = await fetch(`/api/cronjobs/${name}?namespace=${namespace}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend }),
      });
      if (!res.ok) throw new Error("Operation failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjobs", namespace] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/cronjobs/${name}?namespace=${namespace}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjobs", namespace] }),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse">
        Loading CronJobs...
      </div>
    );

  if (error)
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        ⚠️ {(error as Error).message}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">KronDog Dashboard</h2>
          <p className="text-sm text-muted-foreground">{cronjobs?.length ?? 0} CronJobs found in namespace</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cronjobs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No CronJobs found
                </TableCell>
              </TableRow>
            )}
            {cronjobs?.map((cj) => (
              <TableRow key={cj.name} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-mono font-medium">
                  <Link href={`/cronjobs/${cj.name}`} className="hover:underline text-primary">
                    {cj.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cj.schedule}</code>
                </TableCell>
                <TableCell>
                  {cj.suspend ? (
                    <Badge variant="secondary">⏸ Suspended</Badge>
                  ) : (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">▶ Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`font-mono font-bold ${cj.active > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {cj.active}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {cj.lastRunTime
                    ? formatDate(cj.lastRunTime)
                    : "—"}
                </TableCell>
                <TableCell>
                  {cj.lastRunTime ? (
                    <Badge variant="outline" className="text-[10px] font-mono whitespace-nowrap">
                      {cj.lastRunType === "manual" ? "✋ Manual" : "⏱ Scheduled"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">⋯</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/cronjobs/${cj.name}`}>Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerMutation.mutate(cj.name)}>
                        ▶ Run Now
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => suspendMutation.mutate({ name: cj.name, suspend: !cj.suspend })}
                      >
                        {cj.suspend ? "▶ Resume" : "⏸ Suspend"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditScheduleTarget({ name: cj.name, schedule: cj.schedule });
                          setNewSchedule(cj.schedule);
                        }}
                      >
                        ✏️ Edit Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(cj.name)}
                      >
                        🗑 Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              ⚠️ Delete CronJob
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              You are about to permanently delete the CronJob{" "}
              <span className="font-mono font-bold text-foreground">"{deleteTarget}"</span>.{" "}
              This action is <strong className="text-destructive">irreversible</strong> and will also remove all associated Jobs and their logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
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
                {editScheduleTarget?.name}
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
                if (editScheduleTarget && newSchedule) {
                  editScheduleMutation.mutate({
                    name: editScheduleTarget.name,
                    schedule: newSchedule,
                  });
                }
              }}
              disabled={editScheduleMutation.isPending || !newSchedule}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
