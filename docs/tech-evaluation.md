# Tech Evaluation — K8s CronJob Manager

> Obiettivo: scegliere lo stack tecnologico per una **web app** che visualizza e gestisce i CronJob di Kubernetes.
> Requisiti chiave: moderna, performante, maintainable, developer-friendly.

---

## 1. Frontend Framework

### ⚡ React + Vite (con TypeScript)

**Stack**: React 19 + Vite 6 + TypeScript

| | |
|---|---|
| ✅ Ecosistema maturo | Componentistica ricca (shadcn/ui, Radix, Recharts) |
| ✅ React 19 | Server Actions, use(), migliorata gestione concurrent mode |
| ✅ Vite 6 | Build ultraveloce, HMR istantaneo, ESM nativo |
| ✅ Hiring market | Massima diffusione, team facilmente scalabile |
| ❌ Boilerplate | Più verboso di Svelte/Solid |
| ❌ Bundle size | Leggermente più pesante rispetto ad alternative compilate |

**Verdict**: Scelta solida e sicura. Ideale se si vuole un ecosistema ampio con meno rischi.

---

### 🔥 Next.js 15 (React, App Router)

**Stack**: Next.js 15 + React 19 + TypeScript

| | |
|---|---|
| ✅ Full-stack out-of-the-box | API Routes / Server Actions integrate: posso esporre le chiamate a kubectl senza un backend separato |
| ✅ App Router + RSC | Server Components riducono il JS lato client, migliore performance percepita |
| ✅ Turbopack | Dev server fastest in class (Rust-based) |
| ✅ Deploy-ready | Vercel, Docker, self-hosted su K8s stesso |
| ❌ Complessità | Curva di apprendimento per RSC e caching behavior |
| ❌ Overhead per SPA pure | Se l'app è 100% SPA senza SSR, Next porta overhead non necessario |

**Verdict**: Ottima scelta se vogliamo integrare il backend K8s proxy dentro l'app stessa, evitando un microservizio separato. **Candidata principale.**

---

### 🟢 Vue 3 + Vite (con TypeScript)

**Stack**: Vue 3.5 + Vite 6 + TypeScript + Pinia

| | |
|---|---|
| ✅ Composition API | Ergonomia eccellente, simile a React hooks ma più intuitiva |
| ✅ Performance | Virtual DOM ottimizzato, reattività granulare |
| ✅ Leggerezza | Bundle più piccolo di React per app equivalenti |
| ✅ `<script setup>` | DX moderna, TypeScript nativo |
| ❌ Ecosistema più piccolo | Meno componenti pronti rispetto a React |
| ❌ Meno popolare | Team skill meno comuni rispetto a React |

**Verdict**: Valida alternativa, ma nessun vantaggio chiaro su React per questo use case.

---

### ⚡ SvelteKit (Svelte 5)

**Stack**: SvelteKit 2 + Svelte 5 + TypeScript

| | |
|---|---|
| ✅ No Virtual DOM | Compilato a JS puro, bundle minimo, performance runtime massima |
| ✅ Svelte 5 Runes | Nuova reattività basata su signal, molto ergonomica |
| ✅ Full-stack | SvelteKit gestisce routing + API endpoints (come Next.js) |
| ✅ DX eccellente | Sintassi minimal, meno boilerplate in assoluto |
| ❌ Ecosistema immaturo | Librerie UI e community più piccola |
| ❌ Svelte 5 ancora recente | Runes stabili da pochi mesi, meno risorse/tutorial |

**Verdict**: Tecnologicamente molto avanzata e interessante. Valida se si vuole sperimentare il meglio in termini di performance pura.

---

### 🦊 Solid.js + SolidStart

**Stack**: SolidJS 1.9 + SolidStart + TypeScript

| | |
|---|---|
| ✅ Signal-based | Reattività fine-grained, zero re-render non necessari |
| ✅ Performance benchmarks | Tra i framework più veloci in assoluto (jsframework benchmark) |
| ✅ Sintassi React-like | Curva di apprendimento bassa per chi conosce React |
| ❌ Ecosistema piccolo | Community e componenti disponibili limitati |
| ❌ Meno maturo | SolidStart ancora in evoluzione |

**Verdict**: Interessante per performance pura, ma ecosistema troppo piccolo per un'app di produzione.

---

## 2. Backend / Proxy K8s

### Opzione A — Node.js con `@kubernetes/client-node`

```
Stack: Node.js (Express / Fastify / Hono) + @kubernetes/client-node
```

| | |
|---|---|
| ✅ Client ufficiale | Biblioteca ufficialmente supportata da CNCF |
| ✅ Stesso ecosistema | JS/TS end-to-end, un solo linguaggio |
| ✅ Streaming | Supporto WebSocket/watch per aggiornamenti real-time |
| ✅ Hono | Ultra-leggero, edge-ready, TypeScript-first |
| ❌ Performance CPU | Node single-threaded per CPU-intensive |

### Opzione B — Next.js API Routes (integrato nel frontend)

```
Stack: Next.js Server Actions / Route Handlers + @kubernetes/client-node
```

| | |
|---|---|
| ✅ Zero microservizi | Backend integrato direttamente nell'app Next.js |
| ✅ Semplicità di deploy | Un solo container Docker da deployare |
| ✅ TypeScript condiviso | Tipi K8s condivisi tra frontend e backend |
| ❌ Accoppiamento | Frontend e backend nello stesso processo |

### Opzione C — Go con `k8s.io/client-go`

```
Stack: Go + chi/Gin + client-go
```

| | |
|---|---|
| ✅ Performance nativa | Go è lo stesso linguaggio di Kubernetes |
| ✅ client-go | Libreria ufficiale K8s, stessa usata da kubectl |
| ✅ Concorrenza | Goroutine per gestire molte richieste simultanee |
| ❌ Doppio linguaggio | Frontend TS + backend Go, due stack da mantenere |

---

## 3. Styling / UI Components

| Libreria | Note |
|---|---|
| **shadcn/ui** | Componenti customizzabili, Radix-based, no bundle overhead — **top pick** |
| **Radix UI** | Primitivi accessibili, usato da shadcn |
| **TailwindCSS 4** | Utility-first, ora con CSS-native engine (no PostCSS) |
| **Vanilla CSS + CSS Modules** | Massimo controllo, zero dipendenze |

---

## 4. Charts / Visualizzazione dati

| Libreria | Note |
|---|---|
| **Recharts** | React-based, semplice, buono per line/bar chart |
| **Tremor** | Dashboard components pronti, React-based |
| **D3.js** | Massima flessibilità, ma complessità alta |

---

## 5. Real-time Updates

| Soluzione | Note |
|---|---|
| **Server-Sent Events (SSE)** | Semplice, unidirezionale, supportato nativamente dai browser |
| **WebSocket** | Bidirezionale, utile per log streaming |
| **Kubernetes Watch API** | `kubectl get --watch` equivalente via HTTP long-polling |
| **TanStack Query** | Polling automatico + cache intelligente, ideale per status refresh |

---

## 🏆 Raccomandazione finale

| Layer | Scelta consigliata | Alternativa |
|---|---|---|
| **Frontend** | **Next.js 15** (App Router + RSC) | Vite + React 19 (SPA pura) |
| **Backend** | **Integrato in Next.js** (API Routes) | Node.js + Hono separato |
| **K8s client** | **@kubernetes/client-node** | Go + client-go |
| **Styling** | **TailwindCSS 4 + shadcn/ui** | Vanilla CSS |
| **Charts** | **Recharts** o Tremor | D3.js |
| **Real-time** | **TanStack Query** (polling) + SSE per log | WebSocket |

### Motivazioni

1. **Next.js 15** elimina la necessità di un backend separato: le API routes gestiscono le chiamate a `kubectl`/API server K8s, il tutto in un unico progetto TypeScript.
2. **TailwindCSS 4 + shadcn/ui** offre il miglior rapporto tra velocità di sviluppo e qualità visiva, con componenti già accessibili e personalizzabili.
3. **TanStack Query** gestisce caching, polling e invalidazione in modo dichiarativo, perfetto per uno stato K8s che cambia frequentemente.
