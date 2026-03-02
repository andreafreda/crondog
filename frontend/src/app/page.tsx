"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
};

async function fetchCronJobs(): Promise<CronJob[]> {
  const res = await fetch("/api/cronjobs");
  if (!res.ok) throw new Error("Errore nel caricamento dei CronJob");
  return res.json();
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: cronjobs, isLoading, error } = useQuery({
    queryKey: ["cronjobs"],
    queryFn: fetchCronJobs,
  });

  const triggerMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/cronjobs/${name}/trigger`, { method: "POST" });
      if (!res.ok) throw new Error("Trigger fallito");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjobs"] }),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ name, suspend }: { name: string; suspend: boolean }) => {
      const res = await fetch(`/api/cronjobs/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend }),
      });
      if (!res.ok) throw new Error("Operazione fallita");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjobs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/cronjobs/${name}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Eliminazione fallita");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cronjobs"] }),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse">
        Caricamento CronJob...
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
          <h2 className="text-xl font-semibold">CronJob</h2>
          <p className="text-sm text-muted-foreground">{cronjobs?.length ?? 0} trovati nel namespace</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nome</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Attivi</TableHead>
              <TableHead>Ultima esecuzione</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cronjobs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Nessun CronJob trovato
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
                    <Badge variant="secondary">⏸ Sospeso</Badge>
                  ) : (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">▶ Attivo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`font-mono font-bold ${cj.active > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {cj.active}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {cj.lastScheduleTime
                    ? new Date(cj.lastScheduleTime).toLocaleString("it-IT")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">⋯</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/cronjobs/${cj.name}`}>Dettaglio</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerMutation.mutate(cj.name)}>
                        ▶ Esegui ora
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => suspendMutation.mutate({ name: cj.name, suspend: !cj.suspend })}
                      >
                        {cj.suspend ? "▶ Riprendi" : "⏸ Sospendi"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Eliminare il CronJob "${cj.name}"?`))
                            deleteMutation.mutate(cj.name);
                        }}
                      >
                        🗑 Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
