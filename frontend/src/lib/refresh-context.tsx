"use client";

import { createContext, useContext, useState } from "react";

export const REFRESH_OPTIONS = [
    { label: "Off", value: false as false },
    { label: "5s", value: 5_000 },
    { label: "10s", value: 10_000 },
    { label: "30s", value: 30_000 },
    { label: "1 min", value: 60_000 },
] as const;

export type RefreshValue = false | number;

const RefreshContext = createContext<{
    interval: RefreshValue;
    setInterval: (v: RefreshValue) => void;
}>({
    interval: 30_000,
    setInterval: () => { },
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
    const [interval, setIntervalValue] = useState<RefreshValue>(30_000);
    return (
        <RefreshContext.Provider value={{ interval, setInterval: setIntervalValue }}>
            {children}
        </RefreshContext.Provider>
    );
}

export function useRefreshInterval() {
    return useContext(RefreshContext).interval;
}

export function RefreshSelector() {
    const { interval, setInterval } = useContext(RefreshContext);
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs hidden sm:block">Auto-refresh:</span>
            <div className="flex rounded-md border border-border overflow-hidden">
                {REFRESH_OPTIONS.map((opt) => {
                    const active = interval === opt.value;
                    return (
                        <button
                            key={String(opt.value)}
                            onClick={() => setInterval(opt.value)}
                            className={`px-2.5 py-1 text-xs font-medium transition-colors ${active
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
