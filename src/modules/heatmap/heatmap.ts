import { loadData } from "@core/storage"
import { MUSCLES, type MuscleId } from "./muscle-map"
import {
  calculateMuscleLoad,
  detectImbalances,
  getMuscleGroupSummary,
  type RegionSummary,
} from "./heatmap-engine"
import { renderBodyFront, renderBodyBack, applyHeatMap } from "./heatmap-svg"
import type { SessionRecord } from "@core/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_LABELS: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  arms: "Brazos",
  legs: "Piernas",
  core: "Core",
  shoulders: "Hombros",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionsArray(): SessionRecord[] {
  const data = loadData()
  return Object.values(data.sessions)
}

function getMaxLoad(loads: Map<MuscleId, number>): number {
  let max = 0
  for (const v of loads.values()) {
    if (v > max) max = v
  }
  return max
}

// ---------------------------------------------------------------------------
// Render imbalance warnings
// ---------------------------------------------------------------------------

function renderImbalances(container: HTMLElement, sessions: SessionRecord[]): void {
  // Current week (7 days) vs previous week (7-14 days ago)
  const currentLoads = calculateMuscleLoad(sessions, 7)
  const baselineLoads = calculateMuscleLoad(sessions, 14)

  // Subtract current from baseline to get "previous week only"
  const prevWeekLoads = new Map<MuscleId, number>()
  for (const [id, total] of baselineLoads) {
    const current = currentLoads.get(id) ?? 0
    prevWeekLoads.set(id, Math.max(0, total - current))
  }

  const imbalances = detectImbalances(currentLoads, prevWeekLoads)

  if (imbalances.overTrained.length === 0 && imbalances.underTrained.length === 0) return

  const section = document.createElement("div")
  section.className = "imbalance-section"

  const title = document.createElement("div")
  title.className = "imbalance-section__title"
  title.textContent = "Desbalances detectados"
  section.appendChild(title)

  const list = document.createElement("div")

  for (const muscleId of imbalances.overTrained) {
    const badge = document.createElement("span")
    badge.className = "imbalance-indicator imbalance-indicator--over"
    const info = MUSCLES[muscleId]
    badge.textContent = `⬆ ${info?.label ?? muscleId}`
    list.appendChild(badge)
  }

  for (const muscleId of imbalances.underTrained) {
    const badge = document.createElement("span")
    badge.className = "imbalance-indicator imbalance-indicator--under"
    const info = MUSCLES[muscleId]
    badge.textContent = `⬇ ${info?.label ?? muscleId}`
    list.appendChild(badge)
  }

  section.appendChild(list)
  container.appendChild(section)
}

// ---------------------------------------------------------------------------
// Render region summary
// ---------------------------------------------------------------------------

function renderRegionSummary(
  container: HTMLElement,
  summary: Record<string, RegionSummary>,
): void {
  const grid = document.createElement("div")
  grid.className = "region-summary"

  for (const [region, data] of Object.entries(summary)) {
    if (data.total === 0) continue

    const card = document.createElement("div")
    card.className = "region-summary__card"

    const label = document.createElement("div")
    label.className = "region-summary__label"
    label.textContent = REGION_LABELS[region] ?? region

    const value = document.createElement("div")
    value.className = "region-summary__value"
    value.textContent = String(Math.round(data.total))

    const detail = document.createElement("div")
    detail.className = "region-summary__detail"
    detail.textContent = `${data.muscleCount} músculos · prom ${Math.round(data.average)}`

    card.appendChild(label)
    card.appendChild(value)
    card.appendChild(detail)
    grid.appendChild(card)
  }

  container.appendChild(grid)
}

// ---------------------------------------------------------------------------
// init — main entry point
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): void {
  root.innerHTML = ""

  const sessions = getSessionsArray()

  if (sessions.length === 0) {
    root.innerHTML = `
      <div class="heatmap-empty">
        <div class="heatmap-empty__icon">🔥</div>
        <div class="heatmap-empty__text">No hay sesiones registradas.<br>Completá un entrenamiento para ver el mapa muscular.</div>
      </div>
    `
    return
  }

  // Calculate loads for last 7 days
  const loads = calculateMuscleLoad(sessions, 7)
  const maxLoad = getMaxLoad(loads)

  // SVG container
  const svgContainer = document.createElement("div")
  svgContainer.className = "heatmap-container"
  svgContainer.innerHTML = renderBodyFront() + renderBodyBack()
  root.appendChild(svgContainer)

  // Apply heat colors
  if (maxLoad > 0) {
    applyHeatMap(svgContainer, loads, maxLoad)
  }

  // Imbalance warnings
  renderImbalances(root, sessions)

  // Region summary
  const regionSummary = getMuscleGroupSummary(loads)
  renderRegionSummary(root, regionSummary)
}
