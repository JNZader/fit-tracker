import type { ExerciseId } from "@core/types"
import type { SessionRecord } from "@core/types"
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js"

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  LineController,
  LineElement,
  PointElement,
)

// --- Category colors (matches ExerciseConfig.cat) ---

const CAT_COLORS: Record<string, string> = {
  push: "#c4944a",
  pull: "#5a8abf",
  lower: "#4a9a6a",
  core: "#b5a84a",
}

// --- WeakMap cache to track active Chart instances per canvas ---

const chartCache = new WeakMap<HTMLCanvasElement, Chart>()

// --- Public API ---

export function destroyChart(canvas: HTMLCanvasElement): void {
  const existing = chartCache.get(canvas)
  if (existing) {
    existing.destroy()
    chartCache.delete(canvas)
  }
}

/**
 * Bar chart — last 6 weeks of total volume.
 * @param canvas   Target canvas element
 * @param weeklyData  Array of weekly volume totals (up to 6 entries, oldest first)
 */
export function renderWeeklyVolumeChart(canvas: HTMLCanvasElement, weeklyData: number[]): void {
  destroyChart(canvas)

  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()

  const color = accent || "#bf9b3e"

  const labels = weeklyData.map((_, i) => {
    const weeksAgo = weeklyData.length - 1 - i
    return weeksAgo === 0 ? "Esta sem." : `-${weeksAgo}s`
  })

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Volumen",
          data: weeklyData,
          backgroundColor: `${color}99`,
          borderColor: color,
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} reps`,
          },
        },
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#7a7570", font: { size: 11 } },
          grid: { color: "#2a2a2a" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#7a7570", font: { size: 11 } },
          grid: { color: "#2a2a2a" },
        },
      },
    },
  })

  chartCache.set(canvas, chart)
}

/**
 * Line chart — best value per session for a given exercise.
 * @param canvas       Target canvas element
 * @param exerciseId   Exercise to chart
 * @param sessions     All sessions from AppData
 */
export function renderExerciseProgressChart(
  canvas: HTMLCanvasElement,
  exerciseId: ExerciseId,
  sessions: Record<string, SessionRecord>,
): void {
  destroyChart(canvas)

  // Gather data points: (date, best value) sorted ascending
  type DataPoint = { date: string; value: number }

  const points: DataPoint[] = []

  for (const session of Object.values(sessions)) {
    const rounds = session.exercises[exerciseId]
    if (!rounds || rounds.length === 0) continue
    const best = Math.max(...rounds)
    points.push({ date: session.date, value: best })
  }

  points.sort((a, b) => a.date.localeCompare(b.date))

  // Resolve color based on exercise category
  const exerciseCatMap: Record<ExerciseId, string> = {
    push: "push",
    row: "pull",
    bridge: "lower",
    plank: "core",
    wallsit: "lower",
    birddog: "core",
  }

  const cat = exerciseCatMap[exerciseId] ?? "push"
  const color = CAT_COLORS[cat] ?? "#bf9b3e"

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: points.map((p) => p.date.slice(5)), // MM-DD
      datasets: [
        {
          label: exerciseId,
          data: points.map((p) => p.value),
          borderColor: color,
          backgroundColor: `${color}33`,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#7a7570", font: { size: 11 }, maxTicksLimit: 8 },
          grid: { color: "#2a2a2a" },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#7a7570", font: { size: 11 } },
          grid: { color: "#2a2a2a" },
        },
      },
    },
  })

  chartCache.set(canvas, chart)
}
