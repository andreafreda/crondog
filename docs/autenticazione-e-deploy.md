# Guida all'Autenticazione e al Deploy su Kubernetes

Questa guida spiega come l'applicazione KronDog (v0.99.1-SNAPSHOT) si autentica con l'API di Kubernetes e come effettuare il deploy su un cluster Kubernetes remoto.

---

## 📋 Prerequisiti

A seconda di come vuoi eseguire l'applicazione, hai bisogno di quanto segue:

**Per lo Sviluppo Locale:**
- **Node.js** (v18+) e **npm** / **yarn** / **pnpm** per eseguire il frontend in locale.
- Un cluster Kubernetes locale come **minikube**, **kind** o **Docker Desktop Kubernetes**.
- **kubectl** installato e configurato per comunicare con il tuo cluster.

**Per il Deploy nel Cluster (Produzione):**
- Un **Cluster Kubernetes** funzionante (v1.20+).
- L'applicazione pacchettizzata come **immagine Docker** (ti serve Docker per buildarla).
- *Non è richiesto Node.js sul server*, in quanto tutto è autoconfinato all'interno dell'immagine Docker.

---

## 🔐 Come funziona l'Autenticazione

L'applicazione utilizza la libreria ufficiale `@kubernetes/client-node` per comunicare con l'API server di Kubernetes. L'autenticazione viene gestita in modo dinamico a seconda di **dove** l'applicazione è in esecuzione.

Se guardi il file `src/lib/k8s.ts`, vedrai questa logica:

```typescript
function getKubeConfig(): k8s.KubeConfig {
    const kc = new k8s.KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) {
        // L'app sta girando dentro un Pod Kubernetes
        kc.loadFromCluster();
    } else {
        // L'app sta girando in locale (es. tramite `npm run dev`)
        kc.loadFromDefault();
    }
    return kc;
}
```

### 1. Sviluppo Locale (`loadFromDefault()`)
Quando avvii `npm run dev` sul tuo computer, la variabile di ambiente `KUBERNETES_SERVICE_HOST` non esiste. L'applicazione chiama `kc.loadFromDefault()`, che va a leggere le credenziali dal tuo file locale `~/.kube/config` (lo stesso file usato dal comando `kubectl`).

**Se vuoi gestire un cluster remoto dal tuo PC locale**: Non devi fare nulla all'interno del codice dell'app. Ti basta puntare il contesto di `kubectl` verso il cluster remoto (es. `kubectl config use-context mio-cluster-remoto`). L'app Next.js userà automaticamente quelle credenziali.

### 2. Deploy nel Cluster (`loadFromCluster()`)
Quando l'applicazione viene messa in un container e deployata come Pod all'interno del cluster Kubernetes, Kubernetes inietta automaticamente due variabili di ambiente nel container: `KUBERNETES_SERVICE_HOST` e `KUBERNETES_SERVICE_PORT`.

Scorgendo queste variabili, l'app chiama `kc.loadFromCluster()`. Questa funzione legge il token del **ServiceAccount** che Kubernetes monta in automatico nel percorso `/var/run/secrets/kubernetes.io/serviceaccount/token`.

> ⚠️ **IMPORTANTE**: Affinché questo funzioni, al Pod deve essere assegnato un `ServiceAccount` che possiede i permessi corretti (tramite RBAC) per leggere e modificare CronJob, Job e Pod. Di default, i ServiceAccount non hanno alcun permesso.

---

## 🚀 Come effettuare il Deploy su un Cluster Remoto

Per eseguire questa applicazione in modo permanente dentro un cluster Kubernetes remoto (senza usare il tuo computer o la UI locale), segui questi passaggi:

### Step 1: Crea l'immagine Docker

Devi pacchettizzare l'app Next.js in un container Docker e caricarla (push) su un container registry (come Docker Hub, GitHub Container Registry o AWS ECR).

```bash
# Esempio per buildare e fare push su Docker Hub
cd frontend
docker build -t tuo-username/k8s-cronjob-manager:latest .
docker push tuo-username/k8s-cronjob-manager:latest
```
*(Assicurati di avere un `Dockerfile` nella cartella `frontend/` configurato per Next.js).*

### Step 2: Crea i Permessi RBAC (Role & RoleBinding)

La tua app ha bisogno dei permessi per parlare con l'API di K8s. Crea un file chimato `k8s/rbac.yaml`:

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
  # Permessi per elencare i namespaces per il menu a tendina
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["list", "watch"]
  # Permessi per CronJobs e Jobs
  - apiGroups: ["batch"]
    resources: ["cronjobs", "jobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Permessi per i Pods (necessari per scaricare i Logs)
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

### Step 3: Deploy dell'Applicazione (Deployment & Service)

Crea il manifest di deployment per l'app vera e propria nel file `k8s/app.yaml`:

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
      serviceAccountName: cronjob-manager-sa # 👈 Qui alleghiamo le credenziali!
      containers:
        - name: web
          image: tuo-username/k8s-cronjob-manager:latest
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
  type: ClusterIP # Cambia in NodePort o LoadBalancer se vuoi esporlo esternamente
```

### Step 4: Applica le configurazioni al Cluster

Esegui questi comandi usando il tuo `kubectl` locale (puntato sul cluster remoto):

```bash
kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/app.yaml
```

### Step 5: Accedi all'Applicazione

Se hai lasciato il Service come `ClusterIP`, l'app sarà accessibile solo dall'interno del cluster. Per accedervi dal tuo browser per fare dei test, puoi usare il port-forwarding:

```bash
kubectl port-forward svc/cronjob-manager-service 8080:80
```
Dopodiché visita `http://localhost:8080`.

Per esporla permanentemente su internet in un ambiente di produzione, dovresti configurare un controller **Ingress** di Kubernetes (come NGINX Ingress) e puntarci un nome a dominio.
