# Workout App

Modular fitness tracker — Vite + TypeScript + Bun. Refactored from a monolithic HTML/JS file.

## Stack

- **Bundler**: Vite 5
- **Language**: TypeScript 5 (strict mode)
- **Package manager**: Bun
- **Linter/Formatter**: Biome
- **Charts**: Chart.js 4 (tree-shaken)
- **Validation**: Zod 3
- **Deploy**: Cloudflare Pages

## Architecture

Screaming Architecture — each feature is a self-contained module under `src/modules/`. Shared
infrastructure lives in `src/core/` (types, storage, state bus, router). No framework — state
management is a typed EventEmitter.

```
src/
  core/          types, storage, state (EventEmitter), router (hash-based)
  modules/
    timer/       RAF countdown + Web Audio beep
    tracking/    Session logger + Chart.js progression charts
    pr-board/    PR detection + history
    phase/       Phase advancement detector (pure fn) + modal
    export/      JSON download + Zod-validated import
    rutina/      Routine display tab
    ejercicios/  Exercise accordion + SVG illustrations
    sistema/     Phase config + snapshot management
  styles/
    tokens.css   CSS custom properties (dark military theme)
    base.css     Reset + typography + shared components
```

## Running locally

```bash
bun install
bun run dev        # Vite dev server with HMR
bun run build      # TypeScript check + production bundle
bun run lint       # Biome check
bun test           # Bun test runner
```

## localStorage key

All app data is stored under `mil-tracker-v3`.

## Phase exit criteria

| Phase | Exit → Next |
|-------|-------------|
| 1 → 2 | 12 push-ups, 15 rows, 40s plank, 40s wall sit |
| 2 → 3 | 15 push-ups, 18 rows + 5s iso hold, 60s plank, 60s wall sit |
| 3 → 4 | 20 push-ups, 18 rows + 8s iso hold, 75s plank, 75s wall sit |
| 4 | Terminal — 25 push-ups, 20 rows + 8s iso, 90s plank, 90s wall sit |
