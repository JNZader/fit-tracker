import type { MuscleId } from "./muscle-map"
import { getHeatLevel, type HeatLevel } from "./heatmap-engine"

// ---------------------------------------------------------------------------
// SVG body silhouettes with simplified geometric shapes
// viewBox="0 0 200 400" — portrait orientation
// ---------------------------------------------------------------------------

/** Muscle positions for front body view (x, y, rx, ry) */
const FRONT_MUSCLES: Array<{
  id: MuscleId
  label: string
  x: number
  y: number
  rx: number
  ry: number
}> = [
  // Shoulders
  { id: "anterior-deltoid", label: "Ant. Deltoid", x: 62, y: 88, rx: 14, ry: 10 },
  { id: "lateral-deltoid", label: "Lat. Deltoid", x: 138, y: 88, rx: 14, ry: 10 },

  // Chest
  { id: "pectorals", label: "Pectorals", x: 100, y: 110, rx: 28, ry: 14 },

  // Arms (front = biceps side)
  { id: "biceps", label: "Biceps L", x: 50, y: 130, rx: 8, ry: 18 },
  { id: "forearms", label: "Forearms L", x: 44, y: 170, rx: 6, ry: 16 },

  // Core
  { id: "rectus-abdominis", label: "Abs", x: 100, y: 155, rx: 16, ry: 22 },
  { id: "obliques", label: "Obliques", x: 100, y: 160, rx: 26, ry: 16 },
  { id: "serratus", label: "Serratus", x: 72, y: 130, rx: 6, ry: 12 },

  // Hip / Upper legs
  { id: "hip-flexors", label: "Hip Flexors", x: 100, y: 200, rx: 18, ry: 8 },
  { id: "quads", label: "Quads", x: 86, y: 250, rx: 14, ry: 30 },
  { id: "adductors", label: "Adductors", x: 100, y: 240, rx: 8, ry: 18 },

  // Lower legs
  { id: "tibialis", label: "Tibialis", x: 86, y: 320, rx: 8, ry: 20 },
]

/** Muscle positions for back body view */
const BACK_MUSCLES: Array<{
  id: MuscleId
  label: string
  x: number
  y: number
  rx: number
  ry: number
}> = [
  // Shoulders
  { id: "posterior-deltoid", label: "Post. Deltoid", x: 62, y: 88, rx: 14, ry: 10 },

  // Upper back
  { id: "upper-traps", label: "Upper Traps", x: 100, y: 78, rx: 20, ry: 8 },
  { id: "rhomboids", label: "Rhomboids", x: 100, y: 105, rx: 14, ry: 12 },
  { id: "lats", label: "Lats", x: 100, y: 135, rx: 28, ry: 20 },
  { id: "lower-traps", label: "Lower Traps", x: 100, y: 120, rx: 16, ry: 8 },
  { id: "erector-spinae", label: "Erector Spinae", x: 100, y: 165, rx: 10, ry: 22 },

  // Arms (back = triceps side)
  { id: "triceps", label: "Triceps L", x: 50, y: 130, rx: 8, ry: 18 },

  // Glutes
  { id: "glutes", label: "Glutes", x: 100, y: 210, rx: 24, ry: 14 },
  { id: "gluteus-medius", label: "Glute Med", x: 100, y: 198, rx: 20, ry: 8 },

  // Legs
  { id: "hamstrings", label: "Hamstrings", x: 86, y: 260, rx: 14, ry: 28 },
  { id: "calves", label: "Calves", x: 86, y: 320, rx: 10, ry: 22 },
]

// ---------------------------------------------------------------------------
// Body outline SVG (simplified silhouette)
// ---------------------------------------------------------------------------

function bodyOutline(): string {
  return `
    <!-- Head -->
    <ellipse cx="100" cy="35" rx="18" ry="22" fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <!-- Neck -->
    <rect x="92" y="55" width="16" height="12" rx="3" fill="var(--bg3)" stroke="var(--border)" stroke-width="1"/>
    <!-- Torso -->
    <path d="M68 68 Q60 68 58 80 L52 115 L48 175 Q48 195 65 200 L80 205 Q100 210 120 205 L135 200 Q152 195 152 175 L148 115 L142 80 Q140 68 132 68 Z"
          fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <!-- Left arm -->
    <path d="M58 80 Q48 82 44 100 L38 160 L34 190 Q32 198 38 200 L42 198 Q46 196 48 188 L54 145 L56 115"
          fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <!-- Right arm -->
    <path d="M142 80 Q152 82 156 100 L162 160 L166 190 Q168 198 162 200 L158 198 Q154 196 152 188 L146 145 L144 115"
          fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <!-- Left leg -->
    <path d="M80 205 Q75 210 74 230 L72 290 L70 340 L68 370 Q67 380 74 382 L80 380 Q84 378 84 370 L82 340 L84 290 L86 230"
          fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
    <!-- Right leg -->
    <path d="M120 205 Q125 210 126 230 L128 290 L130 340 L132 370 Q133 380 126 382 L120 380 Q116 378 116 370 L118 340 L116 290 L114 230"
          fill="var(--bg3)" stroke="var(--border)" stroke-width="1.5"/>
  `
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

function renderMuscleEllipses(
  muscles: typeof FRONT_MUSCLES,
): string {
  return muscles
    .map(
      (m) =>
        `<ellipse data-muscle="${m.id}" cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" class="muscle muscle--heat-0"><title>${m.label}</title></ellipse>`,
    )
    .join("\n    ")
}

export function renderBodyFront(): string {
  return `<svg class="heatmap-body heatmap-body--front" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
  <text x="100" y="14" text-anchor="middle" class="heatmap-label">FRENTE</text>
  ${bodyOutline()}
  ${renderMuscleEllipses(FRONT_MUSCLES)}
</svg>`
}

export function renderBodyBack(): string {
  return `<svg class="heatmap-body heatmap-body--back" viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
  <text x="100" y="14" text-anchor="middle" class="heatmap-label">ESPALDA</text>
  ${bodyOutline()}
  ${renderMuscleEllipses(BACK_MUSCLES)}
</svg>`
}

// ---------------------------------------------------------------------------
// applyHeatMap — sets heat CSS classes on SVG muscle elements
// ---------------------------------------------------------------------------

export function applyHeatMap(
  container: HTMLElement,
  loads: Map<MuscleId, number>,
  maxLoad: number,
): void {
  const muscleEls = container.querySelectorAll<SVGElement>("[data-muscle]")

  for (const el of muscleEls) {
    const muscleId = el.dataset.muscle as MuscleId
    if (!muscleId) continue

    const load = loads.get(muscleId) ?? 0
    const heat: HeatLevel = getHeatLevel(load, maxLoad)

    // Remove all existing heat classes
    for (let i = 0; i <= 4; i++) {
      el.classList.remove(`muscle--heat-${i}`)
    }

    el.classList.add(`muscle--heat-${heat}`)
  }
}
