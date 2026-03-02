import { NextResponse } from "next/server";
import { getCoreV1Api } from "@/lib/k8s";

export async function GET() {
    try {
        const k8sApi = getCoreV1Api();
        const res = await k8sApi.listNamespace();
        const namespaces = res.items.map((ns) => ns.metadata?.name).filter(Boolean);
        return NextResponse.json(namespaces);
    } catch (error) {
        console.error("Error fetching namespaces:", error);
        return NextResponse.json({ error: "Failed to fetch namespaces" }, { status: 500 });
    }
}
