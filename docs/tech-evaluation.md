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

---

## 6. Confronto diretto: Next.js vs Angular vs React (Vite)

> Confronto focalizzato sul nostro use case specifico: **dashboard interna per gestione CronJob K8s**.

### Overview

| Criterio | Next.js 15 | Angular 19 | React 19 + Vite |
|---|---|---|---|
| **Tipo** | Full-stack framework | SPA framework opinionated | UI library + build tool |
| **Linguaggio** | TypeScript (first-class) | TypeScript (obbligatorio) | TypeScript (opzionale ma consigliato) |
| **Mantentuto da** | Vercel + community | Google | Meta + community |
| **Release model** | Semestrale stabile | Semestrale (major ogni 6 mesi) | Continuo, stabile |
| **Versione attuale** | 15.x (2025) | 19.x (2025) | 19.x (2025) |

---

### Performance

| Aspetto | Next.js 15 | Angular 19 | React 19 + Vite |
|---|---|---|---|
| **Bundle size (base)** | ~90 KB gzip | ~150–200 KB gzip | ~45 KB gzip |
| **Build tool** | Turbopack (Rust, velocissimo) | esbuild / Vite (da v17+) | Vite (ESM nativo) |
| **Rendering** | SSR + SSG + RSC + CSR | CSR (default), SSR con Angular Universal | CSR puro |
| **Server Components** | ✅ (React RSC, zero JS al client) | ❌ | ❌ |
| **Hydration** | Partial hydration con RSC | Full hydration | Full hydration |
| **Runtime performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

> Per una dashboard K8s con aggiornamenti frequenti e tabelle di dati, RSC di Next.js riduce sensibilmente il JS inviato al browser.

---

### Architettura e struttura

| Aspetto | Next.js 15 | Angular 19 | React 19 + Vite |
|---|---|---|---|
| **Routing** | File-based (App Router) | Module-based (RouterModule) | Manuale (React Router / TanStack Router) |
| **State management** | Zustand / Jotai / Context | NgRx / Signals (built-in) | Zustand / Jotai / Redux |
| **DI (Dependency Injection)** | ❌ | ✅ built-in e potente | ❌ |
| **Opinionatedness** | Medio | Alto (tutto strutturato) | Basso (libertà totale) |
| **Backend integrato** | ✅ Route Handlers / Server Actions | ❌ (serve backend separato) | ❌ (serve backend separato) |
| **Struttura progetto** | Convenzionale ma flessibile | Molto rigida (NgModules, Services, Components) | Libera |

---

### Developer Experience

| Aspetto | Next.js 15 | Angular 19 | React 19 + Vite |
|---|---|---|---|
| **Curva di apprendimento** | Media | Alta (concetti: DI, decoratori, zone.js, signals) | Bassa–Media |
| **HMR / Dev speed** | ⭐⭐⭐⭐⭐ (Turbopack) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Vite) |
| **TypeScript** | First-class | Obbligatorio, deeply integrated | Opzionale, ottimo supporto |
| **Testing** | Jest + Playwright | Jasmine/Karma built-in, Cypress | Jest/Vitest + Playwright |
| **CLI / Tooling** | `next` CLI, `create-next-app` | Angular CLI (molto potente) | Vite CLI, `create-vite` |
| **Angular Signals** | N/A | ✅ Reattività fine-grained nativa da v17 | N/A (React ha `use()` e transitions) |

---

### Fit per il nostro progetto

| Requisito | Next.js 15 | Angular 19 | React 19 + Vite |
|---|---|---|---|
| Backend proxy K8s integrato | ✅ Route Handlers | ❌ serve Express/Node separato | ❌ serve Express/Node separato |
| Real-time log streaming (SSE) | ✅ nativo | ⚠️ possibile ma non idiomatico | ✅ con librerie |
| Dashboard con tabelle/charts | ✅ shadcn/ui + Recharts | ✅ PrimeNG, Angular Material | ✅ shadcn/ui + Recharts |
| Deploy su K8s (Dockerfile) | ✅ single container | ✅ ma 2 container (FE + BE) | ✅ ma 2 container (FE + BE) |
| Team piccolo / velocità sviluppo | ✅ | ❌ more setup time | ✅ |
| Enterprise / team grande | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

### Sintesi del confronto

```
Next.js 15   ████████████████████  Vincitore per questo use case
React+Vite   ████████████████░░░░  Buona alternativa (serve backend separato)
Angular 19   ████████████░░░░░░░░  Ottimo per enterprise, ma overkill qui
```

**Angular** è una scelta eccellente per grandi team enterprise, dove la struttura rigida e la DI built-in diventano vantaggi. Per una dashboard interna di medie dimensioni con un team piccolo, introduce complessità e overhead non necessari.

**React + Vite** è la scelta più minimalista e flessibile: velocissimo da bootstrappare, ma richiede un backend separato (Node.js/Hono) per il proxy K8s.

**Next.js 15** vince nel nostro caso: backend integrato, performance RSC, Turbopack, e un ecosistema React completo. Un solo progetto, un solo container Docker.

