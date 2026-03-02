"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type NamespaceContextType = {
    namespace: string;
    setNamespace: (ns: string) => void;
};

const NamespaceContext = createContext<NamespaceContextType | undefined>(undefined);

export function NamespaceProvider({ children }: { children: React.ReactNode }) {
    const [namespace, setNamespace] = useState<string>("default");

    // Persist namespace selection in localStorage
    useEffect(() => {
        const stored = localStorage.getItem("krondog-namespace");
        if (stored) setNamespace(stored);
    }, []);

    const handleSetNamespace = (ns: string) => {
        setNamespace(ns);
        localStorage.setItem("krondog-namespace", ns);
    };

    return (
        <NamespaceContext.Provider value={{ namespace, setNamespace: handleSetNamespace }}>
            {children}
        </NamespaceContext.Provider>
    );
}

export function useNamespace() {
    const context = useContext(NamespaceContext);
    if (!context) {
        throw new Error("useNamespace must be used within a NamespaceProvider");
    }
    return context;
}
