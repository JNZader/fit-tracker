<div align="center">

# 🔥 Fit Tracker

Read this in: [English](README.md) · [Español](README.es.md)

### Tracker de Calistenia Progresiva — Hecho con **TypeScript Puro, Sin Framework**

> Registrá entrenamientos, visualizá la activación muscular, marcá PRs y avanzá por un sistema de calistenia de 4 fases — todo sin el peso de un framework.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://fit-tracker-6ce.pages.dev)
![Deploy](https://img.shields.io/badge/deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-runtime-FBF0DF?logo=bun&logoColor=black)
![Biome](https://img.shields.io/badge/Biome-linter-60A5FA?logo=biome&logoColor=white)

</div>

---

## 🚀 Demo en Vivo

**[fit-tracker-6ce.pages.dev](https://fit-tracker-6ce.pages.dev)** — Desplegado en Cloudflare Pages.

La demo en vivo es el mejor lugar para ver el dashboard, el heatmap y el timer en movimiento.

> **Nota sobre el idioma:** la interfaz de la aplicación está en **español** (`<html lang="es">`, pestañas *Inicio · Rutina · Ejercicios · Sistema · Tracking*). Este README y su contraparte en inglés documentan el código; la app en ejecución es solo en español.

---

## 💡 ¿Por Qué Sin Framework?

Este proyecto usa deliberadamente **TypeScript plano + DOM API + CSS custom properties** en lugar de React, Vue o cualquier framework de UI. La afirmación se sostiene en el código:

- **Solo dos dependencias de runtime** — Chart.js y Zod. Sin framework de UI, sin librería de estado, sin paquete de routing (verificado en `package.json`).
- **Control directo del DOM** — cada módulo renderiza escribiendo sobre su elemento raíz; sin virtual DOM, sin capa de reconciliación.
- **Manejo de estado propio** — un `EventEmitter` tipado (`src/core/state.ts`) impulsa la reactividad a través de un singleton `AppState`.
- **Screaming architecture** — el código se agrupa por dominio de negocio, no por convención de framework.

> *Si podés construir esto sin un framework, entendés la plataforma.*

---

## ✨ Funcionalidades

### 🏋️ Sistema de Entrenamiento
- **Programa progresivo de 4 fases** — Fase 1 → 4, con detección automática de avance de fase
- **6 ejercicios** — Push-ups, Rows, Bridge, Plank, Wall Sit, Bird-Dog
- **Registro de sesiones multi-ronda** — valor por ronda, RPE (1–10), escala de sensación (1–5), registro de zona de dolor, notas
- **Gráfico de volumen semanal** — últimas 6 semanas de volumen total con Chart.js

### 🗺️ Análisis con Heatmap Muscular
- **Taxonomía de 36 músculos** — agrupados por región (pecho, hombros, brazos, espalda, core, cadera, piernas)
- **Mapeo ejercicio-a-músculo** — cada ejercicio activa músculos específicos con contribuciones ponderadas
- **Detección de desbalances** — clasifica los músculos como sobre-entrenados, sub-entrenados o balanceados (función pura)
- **Visualización SVG del cuerpo** — mapas corporales de frente/espalda con niveles de calor 0–4

### 🏆 Récords Personales
- **Detección automática de PRs** al guardar la sesión (función pura, `runPRDetection`)
- **Historial de PRs** — mejor marca histórica por ejercicio, con fecha
- **Notificación toast** cuando se marca un PR nuevo

### ⏱️ Timer Isométrico
- **Cuenta regresiva basada en `requestAnimationFrame`** para una visualización fluida
- **Beep con Web Audio API** — onda sinusoidal de 880 Hz al finalizar
- Embebido dentro de los flujos de Tracking y Ejercicios (no es una pestaña independiente)

### 📈 Avance de Fase
- **Detección automática** cuando se cumplen los criterios de salida (función pura, `detectPhaseAdvancement`)
- **Umbral de consistencia** — 80% de las semanas con ≥3 sesiones por semana
- **Confirmación por modal** antes de avanzar a la fase siguiente

### 💾 Gestión de Datos
- **Versionado por snapshots** — snapshots creados en import, cambio de fase y auto-guardado; con tope de 21 (`MAX_SNAPSHOTS`)
- **Rollback** — restaurar a cualquier snapshot, tomando un snapshot de seguridad antes del rollback
- **Export/import en JSON** — validado con Zod contra el esquema completo
- **Migración de datos legacy** — automática `mil-tracker-v3` → `workout-app-v1` en la primera carga

---

## 🛠️ Stack Técnico

| Capa | Herramienta | Notas |
|-------|------|-------|
| Lenguaje | TypeScript 5.3 | Modo estricto, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Bundler | Vite 5.0 | HMR, tree-shaking, chunks manuales para `chart.js` y `zod` |
| Runtime | Bun | Instalación + test runner |
| Gráficos | Chart.js 4.4 | Separado en su propio chunk |
| Validación | Zod 3.22 | Validación de esquemas en runtime |
| Linter | Biome 1.5 | Linting + formateo |
| Deploy | Cloudflare Pages | Fallback de SPA vía `_redirects` |
| Estado | Typed EventEmitter | Event bus propio, type-safe |
| Routing | Basado en hash | Routing SPA plano |
| Testing | Bun test runner | Tests unitarios de funciones puras |

**Dependencias de runtime: solo 2** — Chart.js y Zod.

**CI** (`.github/workflows/ci.yml`): ante push/PR a `main`, GitHub Actions corre `bun install`, `bun run lint` y `bun run build`. La suite de tests hoy no corre en CI.

---

## 🏗️ Arquitectura

**Screaming Architecture** — funcionalidades agrupadas por dominio, no por tipo. Cada módulo es autocontenido, con su propia lógica, renderizado, estilos y tests.

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

La app expone **5 pestañas** — *Inicio, Rutina, Ejercicios, Sistema, Tracking*. Módulos como `timer`, `heatmap`, `pr-board` y `phase` se componen dentro de esas pestañas en lugar de ser pestañas en sí mismos.

### Decisiones Clave

- **Funciones puras** para detección de fase, detección de PRs y análisis de heatmap — testeables sin un DOM
- **Typed EventEmitter** en lugar de manejo de estado de un framework — un event bus type-safe
- **Storage basado en snapshots** habilita undo/rollback sin un sistema de versionado aparte
- **CSS custom properties** para un design system militar oscuro y mantenible

---

## 🎯 Criterios de Salida de Fase

Los valores de abajo salen directamente de `PHASE_CONFIGS` en `src/modules/phase/phase.ts`. Cada transición exige además **80% de consistencia** (una semana "consistente" tiene ≥3 sesiones) a lo largo de su ventana. Bridge y Bird-Dog se entrenan pero no son requisitos que condicionen el avance.

| Transición | Requisitos | Ventana de consistencia |
|-----------|--------------|--------------------|
| 1 → 2 | 12 push-ups, 15 rows, 40s plank, 40s wall sit | 2 semanas al 80% |
| 2 → 3 | 15 push-ups, 18 rows, 60s plank, 60s wall sit | 2 semanas al 80% |
| 3 → 4 | 20 push-ups, 18 rows, 75s plank, 75s wall sit | 4 semanas al 80% |
| 4 | Fase terminal — sin criterios de salida | — |

---

## 🏃 Correr en Local

```bash
bun install              # Install dependencies
bun run dev              # Vite dev server with HMR
bun run build            # TypeScript check + production bundle
bun run lint             # Biome check
bun run format           # Biome format
bun test                 # Run test suite
```

La suite de tests son **115 tests en 6 archivos**, todos cubriendo funciones puras (types/schemas, storage, detección de fase, detección de PRs, motor de heatmap, mapa muscular).

---

## 🎨 Design System

Tema militar oscuro con tokens de color semánticos:

- **Tipografía** — Oswald (display/mayúsculas), Source Sans Pro (cuerpo) y un stack monoespaciado (`SF Mono`/`Monaco`/`Inconsolata`) para datos
- **Colores** — negros/dorados/grises con acentos semánticos (verde/éxito, azul/info, rojo/peligro)
- **Espaciado** — una escala de 4px → 48px
- **Componentes** — cards (`.cd`), tablas (`.tb`), pills de fase (`.ph`), toasts, modales

---

## 📄 Licencia

MIT
