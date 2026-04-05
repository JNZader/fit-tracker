import type { ExerciseId, ExerciseUnit, PRRecord } from "@core/types"
import { EXERCISE_IDS, EXERCISE_UNITS } from "@core/types"
import { AppState } from "@core/state"

// --- Exercise display config ---

const EXERCISE_LABELS: Record<ExerciseId, string> = {
  [EXERCISE_IDS.PUSH]: "Push-ups",
  [EXERCISE_IDS.ROW]: "Rows",
  [EXERCISE_IDS.BRIDGE]: "Bridge",
  [EXERCISE_IDS.PLANK]: "Plank",
  [EXERCISE_IDS.WALLSIT]: "Wall Sit",
  [EXERCISE_IDS.BIRDDOG]: "Bird Dog",
}

const ALL_EXERCISES: ExerciseId[] = [
  EXERCISE_IDS.PUSH,
  EXERCISE_IDS.ROW,
  EXERCISE_IDS.BRIDGE,
  EXERCISE_IDS.PLANK,
  EXERCISE_IDS.WALLSIT,
  EXERCISE_IDS.BIRDDOG,
]

// --- Pure function: PR detection ---

/**
 * Given a new set of rounds for an exercise, returns a new PRRecord if
 * the best value in `newRounds` exceeds all existing PRs, otherwise null.
 */
export function runPRDetection(
  exerciseId: ExerciseId,
  newRounds: number[],
  existingPRs: PRRecord[],
  unit: ExerciseUnit
): PRRecord | null {
  if (newRounds.length === 0) return null

  const bestValue = Math.max(...newRounds)
  if (bestValue <= 0) return null

  // Check against all existing PRs
  const currentBest = existingPRs.length > 0
    ? Math.max(...existingPRs.map((r) => r.value))
    : 0

  if (bestValue <= currentBest) return null

  return {
    date: new Date().toISOString().slice(0, 10),
    value: bestValue,
    unit,
  }
}

// --- Unit label helper ---

function unitLabel(unit: ExerciseUnit): string {
  return unit === EXERCISE_UNITS.REPS ? "reps" : "seg"
}

// --- Exercise unit mapping ---

const EXERCISE_UNIT_MAP: Record<ExerciseId, ExerciseUnit> = {
  [EXERCISE_IDS.PUSH]: EXERCISE_UNITS.REPS,
  [EXERCISE_IDS.ROW]: EXERCISE_UNITS.REPS,
  [EXERCISE_IDS.BRIDGE]: EXERCISE_UNITS.REPS,
  [EXERCISE_IDS.PLANK]: EXERCISE_UNITS.SECS,
  [EXERCISE_IDS.WALLSIT]: EXERCISE_UNITS.SECS,
  [EXERCISE_IDS.BIRDDOG]: EXERCISE_UNITS.REPS,
}

// --- SVG sparkline ---

function renderSparkline(records: PRRecord[]): string {
  const last5 = records.slice(-5)
  if (last5.length === 0) {
    return `<svg class="pr-sparkline" viewBox="0 0 60 24" aria-hidden="true">
      <text x="0" y="16" font-size="9" fill="var(--text-dim)">sin datos</text>
    </svg>`
  }

  const values = last5.map((r) => r.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const BAR_WIDTH = 8
  const BAR_GAP = 2
  const HEIGHT = 24
  const totalBars = last5.length
  const viewW = totalBars * (BAR_WIDTH + BAR_GAP) - BAR_GAP

  const bars = values.map((v, i) => {
    const barH = Math.max(3, Math.round(((v - min) / range) * (HEIGHT - 4)) + 3)
    const x = i * (BAR_WIDTH + BAR_GAP)
    const y = HEIGHT - barH
    const isMax = v === max
    return `<rect x="${x}" y="${y}" width="${BAR_WIDTH}" height="${barH}"
      rx="1" fill="${isMax ? "var(--accent)" : "var(--bg3)"}"
      stroke="${isMax ? "var(--accent)" : "var(--border)"}" stroke-width="0.5"/>`
  }).join("")

  return `<svg class="pr-sparkline" viewBox="0 0 ${viewW} ${HEIGHT}" aria-hidden="true">${bars}</svg>`
}

// --- Card renderer ---

function renderCard(exerciseId: ExerciseId, prs: PRRecord[]): string {
  const label = EXERCISE_LABELS[exerciseId]
  const unit = EXERCISE_UNIT_MAP[exerciseId]
  const uLabel = unitLabel(unit)

  const currentPR = prs.length > 0
    ? Math.max(...prs.map((r) => r.value))
    : null

  const last5 = prs.slice(-5)
  const historyItems = last5
    .slice()
    .reverse()
    .map((r) => `<li class="pr-history-item">
      <span class="pr-history-date">${r.date}</span>
      <span class="pr-history-value">${r.value} ${uLabel}</span>
    </li>`)
    .join("")

  return `<div class="pr-card" data-exercise="${exerciseId}">
    <div class="pr-card-header">
      <span class="pr-card-label">${label}</span>
      <button class="pr-reset-btn" data-exercise="${exerciseId}" title="Resetear PR">×</button>
    </div>
    <div class="pr-value">
      ${currentPR !== null ? `${currentPR} <span class="pr-unit">${uLabel}</span>` : `<span class="pr-empty">—</span>`}
    </div>
    ${renderSparkline(last5)}
    ${historyItems.length > 0 ? `<ul class="pr-history">${historyItems}</ul>` : ""}
  </div>`
}

// --- UI Component ---

export function init(container: HTMLElement): void {
  function render(): void {
    const state = AppState.getInstance()
    const data = state.getData()

    const cards = ALL_EXERCISES.map((id) => {
      const records = data.prs[id] ?? []
      return renderCard(id, records)
    }).join("")

    container.innerHTML = `<div class="pr-grid">${cards}</div>`

    // Bind reset buttons
    container.querySelectorAll<HTMLButtonElement>(".pr-reset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const exerciseId = btn.dataset["exercise"] as ExerciseId | undefined
        if (!exerciseId) return

        const exerciseLabel = EXERCISE_LABELS[exerciseId] ?? exerciseId
        const confirmed = window.confirm(
          `¿Resetear el PR de ${exerciseLabel}? Esta acción no se puede deshacer.`
        )
        if (!confirmed) return

        AppState.getInstance().mutate((draft) => {
          draft.prs[exerciseId] = []
        })

        render()
      })
    })
  }

  // Initial render
  render()

  // Re-render on PR updates
  AppState.getInstance().on("pr:updated", () => {
    render()
  })
}
