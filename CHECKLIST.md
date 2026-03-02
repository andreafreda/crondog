# K8s CronJob Manager — Checklist

## Fase 1 – Setup ambiente locale
- [ ] Verificare prerequisiti (kubectl, Docker, Node.js, npm)
- [ ] Installare minikube (o Kind) per cluster K8s locale
- [ ] Avviare il cluster locale e verificarne il funzionamento

## Fase 2 – CronJob di prova
- [ ] Creare script hello-world con esito random (successo/fallimento)
- [ ] Scrivere Dockerfile per lo script
- [ ] Buildare l'immagine Docker nel registro locale di minikube
- [ ] Scrivere manifest YAML del CronJob (schedule: `*/5 * * * *`)
- [ ] Deployare il CronJob nel cluster locale
- [ ] Verificare creazione dei Job, log "Hello World" e alternanza successi/fallimenti

## Fase 3 – Valutazione tecnologie frontend
- [ ] Analizzare opzioni frontend (React/Vite, Next.js, Vue, ecc.)
- [ ] Analizzare opzioni per comunicazione con K8s (API diretta, backend proxy con `@kubernetes/client-node`)
- [ ] Scegliere lo stack e documentare motivazioni

## Fase 4 – Sviluppo frontend
- [ ] Scaffolding del progetto frontend
- [ ] Implementare backend/proxy per comunicare con l'API Kubernetes
- [ ] Dashboard — lista CronJob con stato, ultima/prossima esecuzione
- [ ] Pagina dettaglio CronJob — history Job, log, esito
- [ ] Funzionalità CRUD — creare, modificare, sospendere, eliminare CronJob
- [ ] Styling — design moderno, responsive, dark mode

## Fase 5 – Verifica finale
- [ ] Test end-to-end con il CronJob di prova
- [ ] README con istruzioni di avvio
