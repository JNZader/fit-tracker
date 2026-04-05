import { AppState } from "@core/state"
import { createAndPrependSnapshot, loadData, saveData } from "@core/storage"
import type { ExerciseId, Phase, SessionRecord } from "@core/types"
import { EXERCISE_IDS, PAIN_ZONES } from "@core/types"
import { detectPhaseAdvancement } from "@modules/phase/phase"
import { IsometricTimer } from "@modules/timer/timer"
import { destroyChart, renderWeeklyVolumeChart } from "./charts"
import "./tracking.css"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ExerciseConfig {
  id: ExerciseId
  label: string
  unit: "reps" | "secs"
  cat: "push" | "pull" | "lower" | "core"
}

const EXERCISE_CONFIGS: ExerciseConfig[] = [
  { id: EXERCISE_IDS.PUSH, label: "Push-ups", unit: "reps", cat: "push" },
  { id: EXERCISE_IDS.ROW, label: "Remo", unit: "reps", cat: "pull" },
  { id: EXERCISE_IDS.BRIDGE, label: "Glute Bridge", unit: "reps", cat: "lower" },
  { id: EXERCISE_IDS.PLANK, label: "Plank", unit: "secs", cat: "core" },
  { id: EXERCISE_IDS.WALLSIT, label: "Wall Sit", unit: "secs", cat: "lower" },
  { id: EXERCISE_IDS.BIRDDOG, label: "Bird-Dog", unit: "reps", cat: "core" },
]

/** Rounds per phase: Phase 1→3, Phase 2→4, Phase 3→4, Phase 4→5 */
const ROUNDS_PER_PHASE: Record<Phase, number> = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
}

const ISOMETRIC_EXERCISES: ExerciseId[] = [EXERCISE_IDS.PLANK, EXERCISE_IDS.WALLSIT]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-")
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Returns total reps (sum of all rounds across all exercises) for a session */
function sessionVolume(session: SessionRecord): number {
  let total = 0
  for (const rounds of Object.values(session.exercises)) {
    if (rounds) {
      for (const v of rounds) total += v
    }
  }
  return total
}

/** Push:Pull ratio string */
function pushPullRatio(session: SessionRecord): string {
  const pushRounds = session.exercises[EXERCISE_IDS.PUSH] ?? []
  const pullRounds = session.exercises[EXERCISE_IDS.ROW] ?? []
  const push = pushRounds.reduce((a, b) => a + b, 0)
  const pull = pullRounds.reduce((a, b) => a + b, 0)
  if (pull === 0) return push > 0 ? "∞" : "—"
  return (push / pull).toFixed(2)
}

/**
 * Returns the Monday of the ISO week containing the given date.
 */
function startOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Compute weekly volumes for the last 6 weeks (oldest first).
 */
function getWeeklyVolumes(sessions: Record<string, SessionRecord>): number[] {
  const now = new Date()
  const thisWeek = startOfWeek(now)

  // Build week keys for last 6 weeks
  const weeks: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(`${thisWeek}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i * 7)
    weeks.push(d.toISOString().slice(0, 10))
  }

  const volumes = new Map<string, number>()
  for (const wk of weeks) volumes.set(wk, 0)

  for (const session of Object.values(sessions)) {
    const wk = startOfWeek(new Date(`${session.date}T00:00:00Z`))
    if (volumes.has(wk)) {
      volumes.set(wk, (volumes.get(wk) ?? 0) + sessionVolume(session))
    }
  }

  return weeks.map((wk) => volumes.get(wk) ?? 0)
}

/** Semaphore decision based on ΔVolume, RPE avg, pain days */
interface SemaphoreResult {
  color: "green" | "yellow" | "red"
  decision: string
  detail: string
  deltaVolume: number
  rpeAvg: number
  painDays: number
}

function computeSemaphore(sessions: Record<string, SessionRecord>): SemaphoreResult {
  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const lastWeekStart = (() => {
    const d = new Date(`${thisWeekStart}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 7)
    return d.toISOString().slice(0, 10)
  })()

  const thisWeekSessions: SessionRecord[] = []
  const lastWeekSessions: SessionRecord[] = []

  for (const session of Object.values(sessions)) {
    const wk = startOfWeek(new Date(`${session.date}T00:00:00Z`))
    if (wk === thisWeekStart) thisWeekSessions.push(session)
    else if (wk === lastWeekStart) lastWeekSessions.push(session)
  }

  // ΔVolume vs last week
  const thisVol = thisWeekSessions.reduce((acc, s) => acc + sessionVolume(s), 0)
  const lastVol = lastWeekSessions.reduce((acc, s) => acc + sessionVolume(s), 0)
  const deltaVolume = lastVol === 0 ? 0 : Math.round(((thisVol - lastVol) / lastVol) * 100)

  // RPE avg this week
  const rpeSessions = thisWeekSessions.filter((s) => s.rpe !== undefined)
  const rpeAvg =
    rpeSessions.length === 0
      ? 0
      : Math.round(
          (rpeSessions.reduce((acc, s) => acc + (s.rpe ?? 0), 0) / rpeSessions.length) * 10,
        ) / 10

  // Pain days this week
  const painDays = thisWeekSessions.filter(
    (s) => s.pain !== undefined && s.pain !== PAIN_ZONES.NO,
  ).length

  // Decision
  let color: SemaphoreResult["color"]
  let decision: string
  let detail: string

  if (painDays >= 2 || rpeAvg >= 9) {
    color = "red"
    decision = "Descansá"
    detail = painDays >= 2 ? `${painDays} días con dolor` : `RPE promedio ${rpeAvg}`
  } else if (painDays === 1 || rpeAvg >= 7.5 || deltaVolume < -20) {
    color = "yellow"
    decision = "Reducí la carga"
    const reasons: string[] = []
    if (painDays === 1) reasons.push("1 día con dolor")
    if (rpeAvg >= 7.5) reasons.push(`RPE ${rpeAvg}`)
    if (deltaVolume < -20) reasons.push(`Volumen ${deltaVolume}%`)
    detail = reasons.join(" · ")
  } else {
    color = "green"
    decision = "Dale"
    detail =
      deltaVolume === 0 ? "Sin datos de semana anterior" : `+${deltaVolume}% vs semana anterior`
  }

  return { color, decision, detail, deltaVolume, rpeAvg, painDays }
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

type SubView = "log" | "week" | "history"

let rootEl: HTMLElement | null = null
let currentDate: string = todayISO()
let currentView: SubView = "log"
const activeTimers: Map<ExerciseId, IsometricTimer> = new Map()

// ---------------------------------------------------------------------------
// DOM builders
// ---------------------------------------------------------------------------

function getState() {
  return AppState.getInstance()
}

function renderRoundInputs(
  exerciseId: ExerciseId,
  unit: ExerciseConfig["unit"],
  rounds: number[],
  phase: Phase,
): HTMLElement {
  const numRounds = ROUNDS_PER_PHASE[phase]
  const wrap = document.createElement("div")
  wrap.className = "trk-rounds"

  const isIsometric = ISOMETRIC_EXERCISES.includes(exerciseId)

  for (let i = 0; i < numRounds; i++) {
    const lbl = document.createElement("span")
    lbl.className = "trk-round-label"
    lbl.textContent = `S${i + 1}`

    const inp = document.createElement("input")
    inp.type = "number"
    inp.className = "trk-round-input"
    inp.min = "0"
    inp.placeholder = unit === "secs" ? "segs" : "reps"
    inp.value = rounds[i] !== undefined ? String(rounds[i]) : ""
    inp.dataset.round = String(i)
    inp.dataset.exerciseId = exerciseId

    wrap.appendChild(lbl)
    wrap.appendChild(inp)

    // Timer button for isometric exercises
    if (isIsometric && i === 0) {
      const timerBtn = document.createElement("button")
      timerBtn.className = "trk-timer-btn"
      timerBtn.textContent = "⏱"
      timerBtn.title = `Iniciar timer para ${exerciseId}`
      timerBtn.dataset.exerciseId = exerciseId
      timerBtn.dataset.targetInput = "0"

      const runningTimer = activeTimers.get(exerciseId)
      if (runningTimer) timerBtn.classList.add("running")

      timerBtn.addEventListener("click", () => {
        const existing = activeTimers.get(exerciseId)
        if (existing) {
          existing.cancel()
          activeTimers.delete(exerciseId)
          timerBtn.classList.remove("running")
          timerBtn.textContent = "⏱"
          return
        }

        // Default duration: 30 secs (user fills actual time)
        const timer = new IsometricTimer(
          exerciseId,
          99, // large default — user stops manually when done
          (remaining) => {
            timerBtn.textContent = `${remaining}s`
          },
          () => {
            // On complete: fill the first input with elapsed secs
            const elapsed = 99 - 0 // actual elapsed tracked by timer end
            const firstInput = wrap.querySelector<HTMLInputElement>(
              `input[data-round="0"][data-exercise-id="${exerciseId}"]`,
            )
            // The timer auto-fills with a rough elapsed from the stored endTime
            const endTime = Number(sessionStorage.getItem(`timer-end-${exerciseId}`))
            const actualElapsed = endTime ? Math.round((endTime - Date.now()) / -1000) : elapsed

            if (firstInput) {
              firstInput.value = String(Math.max(1, actualElapsed))
            }
            activeTimers.delete(exerciseId)
            timerBtn.classList.remove("running")
            timerBtn.textContent = "⏱"
          },
        )

        activeTimers.set(exerciseId, timer)
        timerBtn.classList.add("running")
        timer.start()
      })

      wrap.appendChild(timerBtn)
    }
  }

  return wrap
}

function buildLogView(): HTMLElement {
  const view = document.createElement("div")
  view.className = "trk-view active"
  view.id = "trk-view-log"

  const state = getState()
  const data = state.getData()
  const phase = data.currentPhase
  const session = data.sessions[currentDate] ?? { date: currentDate, exercises: {} }

  // Date navigator
  const dateNav = document.createElement("div")
  dateNav.className = "trk-date-nav"

  const prevBtn = document.createElement("button")
  prevBtn.className = "trk-date-nav__btn"
  prevBtn.textContent = "←"
  prevBtn.addEventListener("click", () => {
    currentDate = addDays(currentDate, -1)
    renderLog()
  })

  const dateLabel = document.createElement("span")
  dateLabel.className = "trk-date-nav__label"
  dateLabel.textContent = formatDate(currentDate)

  const nextBtn = document.createElement("button")
  nextBtn.className = "trk-date-nav__btn"
  nextBtn.textContent = "→"
  nextBtn.addEventListener("click", () => {
    currentDate = addDays(currentDate, 1)
    renderLog()
  })

  const todayBtn = document.createElement("button")
  todayBtn.className = "trk-date-nav__today"
  todayBtn.textContent = "Hoy"
  todayBtn.addEventListener("click", () => {
    currentDate = todayISO()
    renderLog()
  })

  dateNav.appendChild(prevBtn)
  dateNav.appendChild(dateLabel)
  dateNav.appendChild(nextBtn)
  dateNav.appendChild(todayBtn)
  view.appendChild(dateNav)

  // Exercise cards
  const list = document.createElement("div")
  list.className = "trk-exercise-list"

  for (const cfg of EXERCISE_CONFIGS) {
    const rounds = Array.from(session.exercises[cfg.id] ?? [])

    const card = document.createElement("div")
    card.className = `trk-ex-card trk-ex-card--${cfg.cat}`

    const header = document.createElement("div")
    header.className = "trk-ex-header"

    const label = document.createElement("span")
    label.className = `trk-ex-label trk-ex-label--${cfg.cat}`
    label.textContent = cfg.label

    const unit = document.createElement("span")
    unit.className = "trk-ex-unit"
    unit.textContent = cfg.unit

    header.appendChild(label)
    header.appendChild(unit)
    card.appendChild(header)

    const body = document.createElement("div")
    body.className = "trk-ex-body"
    body.appendChild(renderRoundInputs(cfg.id, cfg.unit, rounds, phase))
    card.appendChild(body)

    list.appendChild(card)
  }

  view.appendChild(list)

  // Meta fields: RPE, Feeling, Pain, Notes
  const meta = document.createElement("div")
  meta.className = "trk-meta"

  // RPE
  const rpeField = document.createElement("div")
  rpeField.className = "trk-field"
  const rpeLabel = document.createElement("label")
  rpeLabel.className = "trk-field__label"
  rpeLabel.textContent = "RPE (1-10)"
  const rpeSelect = document.createElement("select")
  rpeSelect.className = "trk-field__select"
  rpeSelect.id = "trk-rpe"
  const emptyOpt = document.createElement("option")
  emptyOpt.value = ""
  emptyOpt.textContent = "—"
  rpeSelect.appendChild(emptyOpt)
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement("option")
    opt.value = String(i)
    opt.textContent = String(i)
    if (session.rpe === i) opt.selected = true
    rpeSelect.appendChild(opt)
  }
  rpeField.appendChild(rpeLabel)
  rpeField.appendChild(rpeSelect)
  meta.appendChild(rpeField)

  // Feeling
  const feelField = document.createElement("div")
  feelField.className = "trk-field"
  const feelLabel = document.createElement("label")
  feelLabel.className = "trk-field__label"
  feelLabel.textContent = "Sensación (1-5)"
  const feelSelect = document.createElement("select")
  feelSelect.className = "trk-field__select"
  feelSelect.id = "trk-feeling"
  const feelEmpty = document.createElement("option")
  feelEmpty.value = ""
  feelEmpty.textContent = "—"
  feelSelect.appendChild(feelEmpty)
  const feelLabels = ["😣 Muy mal", "😕 Mal", "😐 Normal", "😊 Bien", "🔥 Excelente"]
  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement("option")
    opt.value = String(i)
    opt.textContent = feelLabels[i - 1] ?? String(i)
    if (session.feeling === i) opt.selected = true
    feelSelect.appendChild(opt)
  }
  feelField.appendChild(feelLabel)
  feelField.appendChild(feelSelect)
  meta.appendChild(feelField)

  // Pain
  const painField = document.createElement("div")
  painField.className = "trk-field"
  const painLabel = document.createElement("label")
  painLabel.className = "trk-field__label"
  painLabel.textContent = "Dolor"
  const painSelect = document.createElement("select")
  painSelect.className = "trk-field__select"
  painSelect.id = "trk-pain"
  for (const zone of Object.values(PAIN_ZONES)) {
    const opt = document.createElement("option")
    opt.value = zone
    opt.textContent = zone
    if (session.pain === zone) opt.selected = true
    painSelect.appendChild(opt)
  }
  painField.appendChild(painLabel)
  painField.appendChild(painSelect)
  meta.appendChild(painField)

  // Notes
  const notesField = document.createElement("div")
  notesField.className = "trk-field trk-field--full"
  const notesLabel = document.createElement("label")
  notesLabel.className = "trk-field__label"
  notesLabel.textContent = "Notas"
  const notesArea = document.createElement("textarea")
  notesArea.className = "trk-field__textarea"
  notesArea.id = "trk-notes"
  notesArea.placeholder = "Observaciones de la sesión..."
  notesArea.value = session.notes ?? ""
  notesField.appendChild(notesLabel)
  notesField.appendChild(notesArea)
  meta.appendChild(notesField)

  view.appendChild(meta)

  // Save button
  const saveBtn = document.createElement("button")
  saveBtn.className = "trk-save-btn"
  saveBtn.textContent = "Guardar sesión"
  saveBtn.addEventListener("click", () => {
    const exercises: Partial<Record<ExerciseId, number[]>> = {}

    for (const cfg of EXERCISE_CONFIGS) {
      const inputs = view.querySelectorAll<HTMLInputElement>(`input[data-exercise-id="${cfg.id}"]`)
      const vals: number[] = []
      for (const inp of inputs) {
        const v = Number.parseFloat(inp.value)
        if (!Number.isNaN(v) && v > 0) vals.push(v)
      }
      if (vals.length > 0) exercises[cfg.id] = vals
    }

    const record: SessionRecord = {
      date: currentDate,
      exercises,
    }

    if (rpeSelect.value) {
      record.rpe = Number.parseInt(rpeSelect.value)
    }

    if (feelSelect.value) {
      record.feeling = Number.parseInt(feelSelect.value) as 1 | 2 | 3 | 4 | 5
    }

    const painVal = (painSelect.value || PAIN_ZONES.NO) as SessionRecord["pain"]
    if (painVal) record.pain = painVal

    const notesVal = notesArea.value.trim()
    if (notesVal) record.notes = notesVal

    saveSession(currentDate, record)
  })

  view.appendChild(saveBtn)

  // Session summary
  const summaryEl = buildSummary(session)
  view.appendChild(summaryEl)

  return view
}

function buildSummary(session: SessionRecord): HTMLElement {
  const summary = document.createElement("div")
  summary.className = "trk-summary"

  const title = document.createElement("div")
  title.className = "trk-summary__title"
  title.textContent = "Resumen de sesión"
  summary.appendChild(title)

  const grid = document.createElement("div")
  grid.className = "trk-summary__grid"

  // Total volume
  const volItem = document.createElement("div")
  volItem.className = "trk-summary__item"
  const volLbl = document.createElement("span")
  volLbl.className = "trk-summary__item-label"
  volLbl.textContent = "Volumen total"
  const volVal = document.createElement("span")
  volVal.className = "trk-summary__item-value"
  volVal.textContent = String(sessionVolume(session))
  volItem.appendChild(volLbl)
  volItem.appendChild(volVal)
  grid.appendChild(volItem)

  // Exercises done
  const exItem = document.createElement("div")
  exItem.className = "trk-summary__item"
  const exLbl = document.createElement("span")
  exLbl.className = "trk-summary__item-label"
  exLbl.textContent = "Ejercicios"
  const exVal = document.createElement("span")
  exVal.className = "trk-summary__item-value"
  exVal.textContent = String(Object.keys(session.exercises).length)
  exItem.appendChild(exLbl)
  exItem.appendChild(exVal)
  grid.appendChild(exItem)

  summary.appendChild(grid)

  // Push:pull ratio
  const ratio = document.createElement("div")
  ratio.className = "trk-ratio"
  ratio.innerHTML = `Push:Pull ratio: <strong>${pushPullRatio(session)}</strong>`
  summary.appendChild(ratio)

  return summary
}

function buildWeekView(): HTMLElement {
  const view = document.createElement("div")
  view.className = "trk-view"
  view.id = "trk-view-week"

  const state = getState()
  const data = state.getData()
  const sessions = data.sessions

  // Semaphore
  const sem = computeSemaphore(sessions)
  const semEl = document.createElement("div")
  semEl.className = "trk-semaphore"

  const light = document.createElement("div")
  light.className = `trk-semaphore__light trk-semaphore__light--${sem.color}`

  const info = document.createElement("div")
  info.className = "trk-semaphore__info"

  const decision = document.createElement("div")
  decision.className = "trk-semaphore__decision"
  decision.textContent = sem.decision

  const detail = document.createElement("div")
  detail.className = "trk-semaphore__detail"
  detail.textContent = sem.detail

  info.appendChild(decision)
  info.appendChild(detail)
  semEl.appendChild(light)
  semEl.appendChild(info)
  view.appendChild(semEl)

  // Metrics row
  const metrics = document.createElement("div")
  metrics.className = "trk-week-metrics"

  const metricData = [
    {
      label: "ΔVolumen",
      value: sem.deltaVolume === 0 ? "—" : `${sem.deltaVolume > 0 ? "+" : ""}${sem.deltaVolume}%`,
      color: sem.deltaVolume > 10 ? "green" : sem.deltaVolume < -10 ? "red" : undefined,
    },
    {
      label: "RPE promedio",
      value: sem.rpeAvg === 0 ? "—" : String(sem.rpeAvg),
      color: sem.rpeAvg >= 9 ? "red" : sem.rpeAvg >= 7.5 ? "yellow" : undefined,
    },
    {
      label: "Días con dolor",
      value: String(sem.painDays),
      color: sem.painDays >= 2 ? "red" : sem.painDays === 1 ? "yellow" : undefined,
    },
  ]

  for (const m of metricData) {
    const card = document.createElement("div")
    card.className = "trk-metric-card"

    const lbl = document.createElement("div")
    lbl.className = "trk-metric-card__label"
    lbl.textContent = m.label

    const val = document.createElement("div")
    val.className = `trk-metric-card__value${m.color ? ` trk-metric-card__value--${m.color}` : ""}`
    val.textContent = m.value

    card.appendChild(lbl)
    card.appendChild(val)
    metrics.appendChild(card)
  }

  view.appendChild(metrics)

  // Weekly volume breakdown table (last 6 weeks)
  const weeklyVols = getWeeklyVolumes(sessions)
  const tableWrap = document.createElement("div")
  tableWrap.className = "trk-volume-table"

  const table = document.createElement("table")
  const thead = document.createElement("thead")
  const thRow = document.createElement("tr")
  for (const col of ["Semana", "Volumen"]) {
    const th = document.createElement("th")
    th.textContent = col
    thRow.appendChild(th)
  }
  thead.appendChild(thRow)
  table.appendChild(thead)

  const tbody = document.createElement("tbody")
  const now = new Date()
  const thisWeekStart = startOfWeek(now)

  for (let i = 0; i < weeklyVols.length; i++) {
    const weeksAgo = weeklyVols.length - 1 - i
    const d = new Date(`${thisWeekStart}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - weeksAgo * 7)
    const label = weeksAgo === 0 ? "Esta semana" : `-${weeksAgo} sem.`

    const tr = document.createElement("tr")
    const tdLabel = document.createElement("td")
    tdLabel.textContent = label
    const tdVol = document.createElement("td")
    tdVol.textContent = String(weeklyVols[i] ?? 0)
    tr.appendChild(tdLabel)
    tr.appendChild(tdVol)
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  tableWrap.appendChild(table)
  view.appendChild(tableWrap)

  // Chart
  const chartContainer = document.createElement("div")
  chartContainer.className = "trk-chart-container"

  const chartTitle = document.createElement("div")
  chartTitle.className = "trk-chart-container__title"
  chartTitle.textContent = "Volumen semanal — últimas 6 semanas"

  const chartWrap = document.createElement("div")
  chartWrap.className = "trk-chart-wrap"

  const canvas = document.createElement("canvas")
  chartWrap.appendChild(canvas)
  chartContainer.appendChild(chartTitle)
  chartContainer.appendChild(chartWrap)
  view.appendChild(chartContainer)

  // Render chart after DOM insertion (needs to be visible)
  requestAnimationFrame(() => {
    renderWeeklyVolumeChart(canvas, weeklyVols)
  })

  return view
}

function buildHistoryView(): HTMLElement {
  const view = document.createElement("div")
  view.className = "trk-view"
  view.id = "trk-view-history"

  const state = getState()
  const sessions = state.getData().sessions

  // Toolbar
  const toolbar = document.createElement("div")
  toolbar.className = "trk-history-toolbar"

  const deleteAllBtn = document.createElement("button")
  deleteAllBtn.className = "trk-delete-all-btn"
  deleteAllBtn.textContent = "Eliminar todo"
  deleteAllBtn.addEventListener("click", () => deleteAllSessions())
  toolbar.appendChild(deleteAllBtn)
  view.appendChild(toolbar)

  // Session list (desc)
  const sortedDates = Object.keys(sessions).sort((a, b) => b.localeCompare(a))

  const list = document.createElement("div")
  list.className = "trk-history-list"

  if (sortedDates.length === 0) {
    const empty = document.createElement("div")
    empty.className = "empty"
    const icon = document.createElement("div")
    icon.className = "empty__icon"
    icon.textContent = "📋"
    empty.appendChild(icon)
    empty.appendChild(document.createTextNode("Sin sesiones registradas"))
    list.appendChild(empty)
  }

  for (const date of sortedDates) {
    const session = sessions[date]
    if (!session) continue

    const item = document.createElement("div")
    item.className = "trk-history-item"

    const header = document.createElement("div")
    header.className = "trk-history-item__header"

    const dateSpan = document.createElement("span")
    dateSpan.className = "trk-history-item__date"
    dateSpan.textContent = formatDate(date)

    const metaSpan = document.createElement("span")
    metaSpan.className = "trk-history-item__meta"

    if (session.rpe !== undefined) {
      const rpe = document.createElement("span")
      rpe.textContent = `RPE ${session.rpe}`
      metaSpan.appendChild(rpe)
    }

    if (session.feeling !== undefined) {
      const feel = document.createElement("span")
      const feelLabels: Record<number, string> = {
        1: "😣",
        2: "😕",
        3: "😐",
        4: "😊",
        5: "🔥",
      }
      feel.textContent = feelLabels[session.feeling] ?? String(session.feeling)
      metaSpan.appendChild(feel)
    }

    if (session.pain && session.pain !== PAIN_ZONES.NO) {
      const pain = document.createElement("span")
      pain.textContent = `⚠ ${session.pain}`
      metaSpan.appendChild(pain)
    }

    header.appendChild(dateSpan)
    header.appendChild(metaSpan)
    item.appendChild(header)

    // Exercise badges
    const exercisesEl = document.createElement("div")
    exercisesEl.className = "trk-history-item__exercises"

    for (const cfg of EXERCISE_CONFIGS) {
      const rounds = session.exercises[cfg.id]
      if (!rounds || rounds.length === 0) continue

      const badge = document.createElement("span")
      badge.className = "trk-history-ex-badge"
      const best = Math.max(...rounds)
      badge.textContent = `${cfg.label}: ${rounds.join("/")} ${cfg.unit} (max ${best})`
      exercisesEl.appendChild(badge)
    }

    item.appendChild(exercisesEl)

    if (session.notes) {
      const notes = document.createElement("div")
      notes.className = "trk-history-item__notes"
      notes.textContent = `"${session.notes}"`
      item.appendChild(notes)
    }

    list.appendChild(item)
  }

  view.appendChild(list)
  return view
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------

export function renderLog(): void {
  if (!rootEl) return

  // Cancel active timers when navigating
  for (const timer of activeTimers.values()) {
    timer.cancel()
  }
  activeTimers.clear()

  const existing = document.getElementById("trk-view-log")
  if (existing) existing.remove()

  const viewEl = buildLogView()
  rootEl.querySelector(".trk-body")?.appendChild(viewEl)

  // Show only log
  setActiveView("log")
}

export function renderWeek(): void {
  if (!rootEl) return

  // Destroy old charts
  const oldCanvas = rootEl.querySelector<HTMLCanvasElement>("#trk-view-week canvas")
  if (oldCanvas) destroyChart(oldCanvas)

  const existing = document.getElementById("trk-view-week")
  if (existing) existing.remove()

  const viewEl = buildWeekView()
  rootEl.querySelector(".trk-body")?.appendChild(viewEl)

  setActiveView("week")
}

export function renderHistory(): void {
  if (!rootEl) return

  const existing = document.getElementById("trk-view-history")
  if (existing) existing.remove()

  const viewEl = buildHistoryView()
  rootEl.querySelector(".trk-body")?.appendChild(viewEl)

  setActiveView("history")
}

function setActiveView(view: SubView): void {
  currentView = view

  const views: SubView[] = ["log", "week", "history"]
  for (const v of views) {
    const el = document.getElementById(`trk-view-${v}`)
    if (el) el.classList.toggle("active", v === view)
  }

  const btns = rootEl?.querySelectorAll<HTMLButtonElement>(".trk-subnav__btn")
  if (btns) {
    for (const btn of btns) {
      btn.classList.toggle("active", btn.dataset.view === view)
    }
  }
}

function rerender(): void {
  switch (currentView) {
    case "log":
      renderLog()
      break
    case "week":
      renderWeek()
      break
    case "history":
      renderHistory()
      break
  }
}

// ---------------------------------------------------------------------------
// Business logic
// ---------------------------------------------------------------------------

export function saveSession(date: string, session: SessionRecord): void {
  const state = getState()
  const _data = state.getData()

  state.mutate((draft) => {
    draft.sessions[date] = session
  })

  state.emit("session:saved", { date, session })

  // Check for PR updates
  const updatedData = state.getData()
  for (const cfg of EXERCISE_CONFIGS) {
    const rounds = session.exercises[cfg.id]
    if (!rounds || rounds.length === 0) continue

    const best = Math.max(...rounds)
    const existingPrs = updatedData.prs[cfg.id] ?? []
    const currentBest = existingPrs.reduce((max, pr) => Math.max(max, pr.value), 0)

    if (best > currentBest) {
      state.mutate((draft) => {
        const prList = draft.prs[cfg.id] ?? []
        prList.push({ date, value: best, unit: cfg.unit })
        draft.prs[cfg.id] = prList
      })
      state.emit("pr:updated", {
        exerciseId: cfg.id,
        record: { date, value: best, unit: cfg.unit },
      })
    }
  }

  // Check phase advancement
  const afterData = state.getData()
  const nextPhase = detectPhaseAdvancement(afterData.sessions, afterData.currentPhase)

  if (nextPhase !== null && nextPhase !== afterData.currentPhase) {
    state.emit("phase:advancement-detected", {
      currentPhase: afterData.currentPhase,
      nextPhase,
    })
  }

  rerender()
}

export function deleteAllSessions(): void {
  const confirmed = window.confirm(
    "¿Eliminar TODAS las sesiones? Esta acción no se puede deshacer.",
  )
  if (!confirmed) return

  const state = getState()
  const data = state.getData()

  // Create snapshot before delete
  createAndPrependSnapshot(data, "Pre-borrado de sesiones", "manual")

  state.mutate((draft) => {
    draft.sessions = {}
    draft.prs = {}
  })

  rerender()
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

export function init(container: HTMLElement): void {
  rootEl = container
  container.innerHTML = ""

  // Sub-nav
  const subnav = document.createElement("div")
  subnav.className = "trk-subnav"

  const subnavItems: Array<{ label: string; view: SubView }> = [
    { label: "Registro", view: "log" },
    { label: "Semana", view: "week" },
    { label: "Historial", view: "history" },
  ]

  for (const item of subnavItems) {
    const btn = document.createElement("button")
    btn.className = "trk-subnav__btn"
    btn.textContent = item.label
    btn.dataset.view = item.view

    if (item.view === currentView) btn.classList.add("active")

    btn.addEventListener("click", () => {
      switch (item.view) {
        case "log":
          renderLog()
          break
        case "week":
          renderWeek()
          break
        case "history":
          renderHistory()
          break
      }
    })

    subnav.appendChild(btn)
  }

  container.appendChild(subnav)

  // Body container for sub-views
  const body = document.createElement("div")
  body.className = "trk-body"
  container.appendChild(body)

  // Mount initial view
  const logView = buildLogView()
  const weekView = buildWeekView()
  const histView = buildHistoryView()

  body.appendChild(logView)
  body.appendChild(weekView)
  body.appendChild(histView)

  setActiveView(currentView)

  // Event listeners
  const state = getState()

  state.on("snapshot:restored", () => {
    rerender()
  })

  state.on("import:completed", () => {
    rerender()
  })

  state.on("phase:changed", () => {
    rerender()
  })
}
