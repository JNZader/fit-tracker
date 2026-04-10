# Fit Tracker

Progressive calisthenics tracker with a 4-phase training system, muscle heatmaps, PR detection, isometric timers, and snapshot-based rollback. Built with vanilla TypeScript — no framework overhead.

[![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](#)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](#)
[![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?logo=bun&logoColor=black)](#)
[![Biome](https://img.shields.io/badge/Biome-linter-60A5FA?logo=biome&logoColor=white)](#)

## Features

### Training System
- **4-phase progressive program** — Base → Development → Strength → Elite with automatic phase advancement
- **6 core exercises** — Push-ups, Rows, Bridge, Plank, Wall Sit, Bird-Dog
- **Multi-round session logging** — reps/duration per round, RPE (1-10), feeling scale, pain tracking, notes
- **Weekly volume charts** — last 6 weeks of total reps via Chart.js

### Muscle Heatmap Analysis
- **36-muscle taxonomy** — chest, shoulders, arms, back, core, hips, legs
- **Exercise-to-muscle mapping** — each exercise loads specific muscles with weighted contributions
- **Imbalance detection** — over-trained, under-trained, and balanced region identification
- **SVG body visualization** — color-coded heat intensity (4 levels) with weekly trends

### Personal Records
- **Automatic PR detection** on every session save (pure function)
- **PR history** — all-time bests per exercise with date tracking
- **Toast notifications** when a new PR is set

### Isometric Timer
- **RAF-based countdown** — 60 Hz refresh for smooth display
- **Web Audio API beep** — 880 Hz sine wave on completion
- **Per-round progress tracking** with localStorage persistence

### Phase Advancement
- **Automatic detection** when exit criteria are met (pure function)
- **Consistency threshold** — 80% adherence (≥3 sessions/week)
- **Modal confirmation** before advancing to next phase

### Data Management
- **Snapshot versioning** — auto-snapshots on phase change, import, and periodic saves (max 21)
- **Rollback** — restore to any snapshot with pre-rollback safety snapshot
- **JSON export/import** — Zod-validated with full schema checking
- **Legacy migration** — automatic `mil-tracker-v3` → `workout-app-v1` on first load

## Tech Stack

| Layer | Tool |
|-------|------|
| Language | TypeScript 5.3 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Bundler | Vite 5.0 |
| Runtime | Bun |
| Charts | Chart.js 4.4 (tree-shaken) |
| Validation | Zod 3.22 |
| Linter | Biome 1.5 |
| Deploy | Cloudflare Pages |
| State | Typed EventEmitter (custom) |
| Routing | Hash-based (vanilla) |
| Testing | Bun test runner |

**No framework** — vanilla TypeScript + DOM API + CSS custom properties for minimal bundle size.

## Architecture

Screaming Architecture — features grouped by domain, not by type. Each module is self-contained with its own logic, rendering, styles, and tests.

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
│   ├── phase/             # Phase advancement detector + modal
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

### Key Decisions

- **Pure functions** for phase detection, PR detection, and heatmap analysis — testable without DOM
- **Typed EventEmitter** instead of framework state management — type-safe event bus
- **Snapshot-based storage** enables undo/rollback without a separate versioning system
- **CSS custom properties** for a maintainable dark military design system

## Phase Exit Criteria

| Phase | Requirements | Consistency |
|-------|-------------|-------------|
| 1 → 2 | 12 push-ups, 15 rows, 40s plank, 40s wall sit | 2 weeks at 80% |
| 2 → 3 | 15 push-ups, 18 rows + 5s iso hold, 60s plank, 60s wall sit | — |
| 3 → 4 | 20 push-ups, 18 rows + 8s iso hold, 75s plank, 75s wall sit | 4 weeks at 80% |
| 4 (Elite) | 25 push-ups, 20 rows + 8s iso, 90s plank, 90s wall sit | Terminal |

## Running Locally

```bash
bun install              # Install dependencies
bun run dev              # Vite dev server with HMR
bun run build            # TypeScript check + production bundle
bun run lint             # Biome check
bun format               # Biome format
bun test                 # Run test suite
```

## Design System

Dark military theme with semantic color tokens:

- **Typography** — Oswald (display/uppercase), Source Sans Pro (body), SF Mono (data)
- **Colors** — blacks/golds/grays with semantic accents (green/success, blue/info, red/danger)
- **Spacing** — 4px → 64px scale (8 steps)
- **Components** — cards (`.cd`), tables (`.tb`), phase pills (`.ph`), toasts, modals

## License

MIT
