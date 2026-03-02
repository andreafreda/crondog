# Kubernetes Authentication & Deployment Guide

This guide explains how the KronDog (v0.99.1-SNAPSHOT) application authenticates with the Kubernetes API and how to deploy it to a remote Kubernetes cluster.

---

## 📋 Prerequisites

Depending on how you want to run the application, you need the following:

**For Local Development:**
- **Node.js** (v18+) and **npm** / **yarn** / **pnpm** to run the frontend locally.
- A local Kubernetes cluster like **minikube**, **kind**, or **Docker Desktop Kubernetes**.
- **kubectl** installed and configured to communicate with your cluster.

**For In-Cluster Deployment (Production):**
- A running **Kubernetes Cluster** (v1.20+).
- The application packaged as a **Docker image** (you need Docker to build it).
- *No Node.js is required on the server*, as everything is self-contained in the Docker container.

---

## 🔐 How Authentication Works

The application uses the official `@kubernetes/client-node` library to communicate with the Kubernetes API server. Authentication is handled dynamically depending on **where** the application is running.

If you look at `src/lib/k8s.ts`, you'll see this logic:

```typescript
function getKubeConfig(): k8s.KubeConfig {
    const kc = new k8s.KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) {
        // We are running inside a Kubernetes Pod
        kc.loadFromCluster();
    } else {
        // We are running locally (e.g., via `npm run dev`)
        kc.loadFromDefault();
    }
    return kc;
}
```

### 1. Local Development (`loadFromDefault()`)
When running `npm run dev` on your laptop, the `KUBERNETES_SERVICE_HOST` environment variable is missing. The app calls `kc.loadFromDefault()`, which looks for credentials in your local `~/.kube/config` file (the same file used by `kubectl`).

**If you want to manage a remote cluster locally**: You don't need to do anything inside the app. Simply point your `kubectl` context to the remote cluster (e.g., `kubectl config use-context my-remote-cluster`). The Next.js app will automatically use that cluster's credentials.

### 2. In-Cluster Deployment (`loadFromCluster()`)
When the application is containerized and deployed as a Pod inside the Kubernetes cluster, Kubernetes automatically injects two environment variables into the container: `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT`. 

Seeing this, the app calls `kc.loadFromCluster()`. This reads the **ServiceAccount** token automatically mounted by Kubernetes at `/var/run/secrets/kubernetes.io/serviceaccount/token`.

> ⚠️ **IMPORTANT**: For this to work, the Pod must be assigned a `ServiceAccount` that has the correct permissions (RBAC) to read and modify CronJobs, Jobs, and Pods. By default, ServiceAccounts have no permissions.

---

## 🚀 How to Deploy on a Remote Cluster

To run this application permanently inside a remote Kubernetes cluster (without using your local computer or `kube ui`), follow these steps:

### Step 1: Build the Docker Image

You need to package the Next.js app into a Docker container and push it to a container registry (like Docker Hub, GitHub Container Registry, or AWS ECR).

```bash
# Example building and pushing to Docker Hub
cd frontend
docker build -t your-username/k8s-cronjob-manager:latest .
docker push your-username/k8s-cronjob-manager:latest
```
*(Ensure you have a `Dockerfile` in the `frontend/` directory configured for Next.js).*

### Step 2: Create RBAC Permissions (Role & RoleBinding)

Your app needs permission to talk to the K8s API. Create a file named `k8s/rbac.yaml`:

```yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cronjob-manager-sa
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cronjob-manager-role
rules:
  # Permissions to list namespaces dynamically
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["list", "watch"]
  # Permissions for CronJobs and Jobs
  - apiGroups: ["batch"]
    resources: ["cronjobs", "jobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Permissions for Pods (required to fetch Logs)
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cronjob-manager-rolebinding
subjects:
  - kind: ServiceAccount
    name: cronjob-manager-sa
    namespace: default
roleRef:
  kind: ClusterRole
  name: cronjob-manager-role
  apiGroup: rbac.authorization.k8s.io
```

### Step 3: Deploy the Application (Deployment & Service)

Create the deployment manifest for the app itself in `k8s/app.yaml`:

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cronjob-manager-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cronjob-manager
  template:
    metadata:
      labels:
        app: cronjob-manager
    spec:
      serviceAccountName: cronjob-manager-sa # 👈 Attach the credentials here!
      containers:
        - name: web
          image: your-username/k8s-cronjob-manager:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: K8S_NAMESPACE
              value: "default"
---
apiVersion: v1
kind: Service
metadata:
  name: cronjob-manager-service
  namespace: default
spec:
  ports:
    - port: 80
      targetPort: 3000
  selector:
    app: cronjob-manager
  type: ClusterIP # Change to NodePort or LoadBalancer if you want to expose it externally
```

### Step 4: Apply to the Cluster

Run these commands using your local `kubectl` (pointed at the remote cluster):

```bash
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/app.yaml
```

### Step 5: Access the App

If you left the Service as `ClusterIP`, it is only accessible inside the cluster. To access it from your browser, you can port-forward it:

```bash
kubectl port-forward svc/cronjob-manager-service 8080:80
```
Then visit `http://localhost:8080`.

To expose it permanently to the internet, you should configure a Kubernetes **Ingress** controller (like NGINX Ingress) and point a domain name to it.
