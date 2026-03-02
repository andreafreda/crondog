"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 15 * 1000, // 15s
                        refetchInterval: 30 * 1000, // polling every 30s
                    },
                },
            })
    );
    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
