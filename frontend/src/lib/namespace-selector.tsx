"use client";

import { useQuery } from "@tanstack/react-query";
import { useNamespace } from "./namespace-context";

export function NamespaceSelector() {
    const { namespace, setNamespace } = useNamespace();

    const { data: namespaces, isLoading } = useQuery<string[]>({
        queryKey: ["namespaces"],
        queryFn: async () => {
            const res = await fetch("/api/namespaces");
            if (!res.ok) throw new Error("Failed to load namespaces");
            return res.json();
        },
    });

    if (isLoading) {
        return <span className="text-xs text-muted-foreground mt-0.5">Kubernetes · loading namespaces...</span>;
    }

    return (
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>Kubernetes · namespace:</span>
            <select
                className="bg-transparent border-b border-muted-foreground/30 focus:outline-none focus:border-primary text-foreground ml-1"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
            >
                {namespaces?.map((ns) => (
                    <option key={ns} value={ns} className="bg-background text-foreground">
                        {ns}
                    </option>
                ))}
                {!namespaces?.includes(namespace) && (
                    <option value={namespace} className="bg-background text-foreground">
                        {namespace}
                    </option>
                )}
            </select>
        </div>
    );
}
