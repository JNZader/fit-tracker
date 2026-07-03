<div align="center">

# 🔥 Fit Tracker

Read this in: [English](README.md) · [Español](README.es.md)

### Progressive Calisthenics Tracker — Built with **Pure TypeScript, No Framework**

> Track workouts, visualize muscle engagement, hit PRs, and progress through a 4-phase calisthenics system — all with zero framework overhead.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://fit-tracker-6ce.pages.dev)
![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?logo=bun&logoColor=black)
![Biome](https://img.shields.io/badge/Biome-linter-60A5FA?logo=biome&logoColor=white)

</div>

---

## 🚀 Live Demo

**[fit-tracker-6ce.pages.dev](https://fit-tracker-6ce.pages.dev)** — Deployed on Cloudflare Pages.

The live demo is the best place to see the dashboard, heatmap, and timer in motion.

> **Note on language:** the application UI is in **Spanish** (`<html lang="es">`, tabs *Inicio · Rutina · Ejercicios · Sistema · Tracking*). This README and its Spanish counterpart document the codebase; the running app is Spanish-only.

---

## 💡 Why No Framework?

This project deliberately uses **vanilla TypeScript + DOM API + CSS custom properties** instead of React, Vue, or any UI framework. The claim holds up in the code:

- **Two runtime dependencies only** — Chart.js and Zod. No UI framework, no state library, no router package (verified in `package.json`).
- **Direct DOM control** — modules render by writing to their root element; no virtual DOM, no reconciliation layer.
- **Custom state management** — a typed `EventEmitter` (`src/core/state.ts`) drives reactivity through a singleton `AppState`.
- **Screaming architecture** — code is grouped by feature domain, not by framework convention.

> *If you can build this without a framework, you understand the platform.*

---

## ✨ Features

### 🏋️ Training System
- **4-phase progressive program** — Phase 1 → 4, with automatic phase-advancement detection
- **6 exercises** — Push-ups, Rows, Bridge, Plank, Wall Sit, Bird-Dog
- **Multi-round session logging** — value per round, RPE (1–10), feeling scale (1–5), pain-zone tracking, notes
- **Weekly volume chart** — last 6 weeks of total volume via Chart.js

### 🗺️ Muscle Heatmap Analysis
- **36-muscle taxonomy** — grouped by region (chest, shoulders, arms, back, core, hips, legs)
- **Exercise-to-muscle mapping** — each exercise activates specific muscles with weighted contributions
- **Imbalance detection** — classifies muscles as over-trained, under-trained, or balanced (pure function)
- **SVG body visualization** — front/back body maps with heat levels 0–4

### 🏆 Personal Records
- **Automatic PR detection** on session save (pure function, `runPRDetection`)
- **PR history** — all-time best per exercise, with date
- **Toast notification** when a new PR is set

### ⏱️ Isometric Timer
- **`requestAnimationFrame`-based countdown** for smooth display
- **Web Audio API beep** — 880 Hz sine wave on completion
- Embedded inside the Tracking and Ejercicios flows (not a standalone tab)

### 📈 Phase Advancement
- **Automatic detection** when exit criteria are met (pure function, `detectPhaseAdvancement`)
- **Consistency threshold** — 80% of weeks with ≥3 sessions/week
- **Modal confirmation** before advancing to the next phase

### 💾 Data Management
- **Snapshot versioning** — snapshots created on import, phase change, and auto-save; capped at 21 (`MAX_SNAPSHOTS`)
- **Rollback** — restore to any snapshot, with a safety snapshot taken before rollback
- **JSON export/import** — Zod-validated against the full schema
- **Legacy migration** — automatic `mil-tracker-v3` → `workout-app-v1` on first load

---

## 🛠️ Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Language | TypeScript 5.3 | Strict mode, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Bundler | Vite 5.0 | HMR, tree-shaking, manual chunks for `chart.js` and `zod` |
| Runtime | Bun | Install + test runner |
| Charts | Chart.js 4.4 | Split into its own chunk |
| Validation | Zod 3.22 | Runtime schema validation |
| Linter | Biome 1.5 | Linting + formatting |
| Deploy | Cloudflare Pages | SPA fallback via `_redirects` |
| State | Typed EventEmitter | Custom, type-safe event bus |
| Routing | Hash-based | Vanilla SPA routing |
| Testing | Bun test runner | Unit tests for pure functions |

**Runtime dependencies: only 2** — Chart.js and Zod.

**CI** (`.github/workflows/ci.yml`): on push/PR to `main`, GitHub Actions runs `bun install`, `bun run lint`, and `bun run build`. The test suite is not currently run in CI.

---

## 🏗️ Architecture

**Screaming Architecture** — features grouped by domain, not by type. Each module is self-contained with its own logic, rendering, styles, and tests.

```
src/
├── core/                  # Shared infrastructure
│   ├── types.ts           # Single source of truth (Zod schemas, exercises, phases)
│   ├── state.ts           # TypedEventEmitter + AppState singleton
│   ├── storage.ts         # localStorage + snapshots + migration
│   ├── router.ts          # Hash-based tab navigation
│   └── *.test.ts          # Core tests
│
├── modules/               # Feature modules
│   ├── home/              # Dashboard: streak, weekly target, PRs, quick actions
│   ├── timer/             # RAF countdown + Web Audio beep
│   ├── tracking/          # Session logger + Chart.js progression
│   ├── pr-board/          # PR detection (pure fn) + history
│   ├── phase/             # Phase advancement detector + criteria
│   ├── heatmap/           # 36-muscle load analysis + SVG body + imbalance detection
│   ├── export/            # JSON export/import + Zod validation
│   ├── rutina/            # Training routine display (per phase)
│   ├── ejercicios/        # Exercise library + accordion + SVG illustrations
│   └── sistema/           # RPE guide, push:pull ratio, form tips
│
├── styles/
│   ├── tokens.css         # CSS custom properties (dark military theme)
│   └── base.css           # Reset, typography, shared components
│
└── main.ts                # Bootstrap: modules, routing, events, modals
```

The app exposes **5 tabs** — *Inicio, Rutina, Ejercicios, Sistema, Tracking*. Modules such as `timer`, `heatmap`, `pr-board`, and `phase` are composed inside those tabs rather than being tabs themselves.

### Key Decisions

- **Pure functions** for phase detection, PR detection, and heatmap analysis — testable without a DOM
- **Typed EventEmitter** instead of framework state management — a type-safe event bus
- **Snapshot-based storage** enables undo/rollback without a separate versioning system
- **CSS custom properties** for a maintainable dark military design system

---

## 🎯 Phase Exit Criteria

Values below are taken directly from `PHASE_CONFIGS` in `src/modules/phase/phase.ts`. Each transition also requires **80% consistency** (a "consistent" week has ≥3 sessions) across its window. Bridge and Bird-Dog are trained but are not gating requirements.

| Transition | Requirements | Consistency window |
|-----------|--------------|--------------------|
| 1 → 2 | 12 push-ups, 15 rows, 40s plank, 40s wall sit | 2 weeks at 80% |
| 2 → 3 | 15 push-ups, 18 rows, 60s plank, 60s wall sit | 2 weeks at 80% |
| 3 → 4 | 20 push-ups, 18 rows, 75s plank, 75s wall sit | 4 weeks at 80% |
| 4 | Terminal phase — no exit criteria | — |

---

## 🏃 Running Locally

```bash
bun install              # Install dependencies
bun run dev              # Vite dev server with HMR
bun run build            # TypeScript check + production bundle
bun run lint             # Biome check
bun run format           # Biome format
bun test                 # Run test suite
```

The test suite is **115 tests across 6 files**, all covering pure functions (types/schemas, storage, phase detection, PR detection, heatmap engine, muscle map).

---

## 🎨 Design System

Dark military theme with semantic color tokens:

- **Typography** — Oswald (display/uppercase), Source Sans Pro (body), and a monospace stack (`SF Mono`/`Monaco`/`Inconsolata`) for data
- **Colors** — blacks/golds/grays with semantic accents (green/success, blue/info, red/danger)
- **Spacing** — a 4px → 48px scale
- **Components** — cards (`.cd`), tables (`.tb`), phase pills (`.ph`), toasts, modals

---

## 📄 License

MIT
