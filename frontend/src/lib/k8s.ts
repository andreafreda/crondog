import * as k8s from "@kubernetes/client-node";

// Singleton: reuse the same instance across the entire app
let batchV1Api: k8s.BatchV1Api | null = null;
let coreV1Api: k8s.CoreV1Api | null = null;

function getKubeConfig(): k8s.KubeConfig {
    const kc = new k8s.KubeConfig();
    // Locally loads kubeconfig from ~/.kube/config (minikube)
    // In-cluster uses the service account automatically
    if (process.env.KUBERNETES_SERVICE_HOST) {
        kc.loadFromCluster();
    } else {
        kc.loadFromDefault();
    }
    return kc;
}

export function getBatchV1Api(): k8s.BatchV1Api {
    if (!batchV1Api) {
        const kc = getKubeConfig();
        batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
    }
    return batchV1Api;
}

export function getCoreV1Api(): k8s.CoreV1Api {
    if (!coreV1Api) {
        const kc = getKubeConfig();
        coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
    }
    return coreV1Api;
}

export function getLogStream(namespace: string, podName: string) {
    const kc = getKubeConfig();
    const log = new k8s.Log(kc);
    return log;
}

export type { k8s };
