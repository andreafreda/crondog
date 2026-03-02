import { getCoreV1Api } from "@/lib/k8s";

type Params = { params: Promise<{ name: string }> };

// GET /api/pods/[name]/logs — SSE streaming of pod logs
export async function GET(req: Request, { params }: Params) {
    const { name } = await params;
    const { searchParams } = new URL(req.url);
    const namespace = searchParams.get("namespace") || "default";
    const api = getCoreV1Api();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                const logResponse = await api.readNamespacedPodLog({
                    name,
                    namespace,
                    follow: false,
                    tailLines: 200,
                    timestamps: true,
                });

                const lines =
                    typeof logResponse === "string"
                        ? logResponse.split("\n")
                        : [String(logResponse)];

                for (const line of lines) {
                    if (line.trim()) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                controller.close();
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Log error";
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
