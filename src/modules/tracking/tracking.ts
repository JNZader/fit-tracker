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

type SubView = "log" | "week" | "activity" | "history"

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

// ---------------------------------------------------------------------------
// Activity helpers
// ---------------------------------------------------------------------------

/** Returns sessions in the current calendar year */
function sessionsThisYear(sessions: Record<string, SessionRecord>): SessionRecord[] {
  const year = new Date().getFullYear()
  return Object.values(sessions).filter((s) => s.date.startsWith(String(year)))
}

/**
 * Racha actual: consecutive training days up to today, skipping Sundays.
 * A day is "supposed to train" if it is Mon–Sat and the user trained.
 * Streak breaks on the first Mon–Sat day that has no session.
 */
function computeStreak(sessions: Record<string, SessionRecord>): number {
  const trainingDays = new Set(Object.keys(sessions))
  let streak = 0
  const today = new Date()
  // Walk backwards from today
  for (let offset = 0; offset <= 365; offset++) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const dow = d.getDay() // 0=Sun
    if (dow === 0) continue // skip Sundays
    const iso = d.toISOString().slice(0, 10)
    if (trainingDays.has(iso)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

/**
 * Consistency %: sessions this year / (elapsed weeks × target days per phase).
 * Target days per phase: Phase 1 → 3, Phase 2 → 4, Phase 3 → 4, Phase 4 → 5.
 */
function computeConsistency(
  sessions: Record<string, SessionRecord>,
  phase: Phase,
): number {
  const targetDays = ROUNDS_PER_PHASE[phase] // reusing same map (3/4/4/5)
  const yearStart = new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`)
  const now = new Date()
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksElapsed = Math.max(1, Math.floor((now.getTime() - yearStart.getTime()) / msPerWeek))
  const expected = weeksElapsed * targetDays
  const actual = sessionsThisYear(sessions).length
  return Math.min(100, Math.round((actual / expected) * 100))
}

/** Build 365-day map: date → {volume, hasPain} */
interface DayData {
  volume: number
  hasPain: boolean
}

function buildDayMap(sessions: Record<string, SessionRecord>): Map<string, DayData> {
  const map = new Map<string, DayData>()
  for (const session of Object.values(sessions)) {
    const vol = sessionVolume(session)
    const pain = session.pain !== undefined && session.pain !== PAIN_ZONES.NO
    map.set(session.date, { volume: vol, hasPain: pain })
  }
  return map
}

/** Returns color for a heatmap cell */
function heatColor(dayData: DayData | undefined, maxVol: number): string {
  if (!dayData || dayData.volume === 0) return "#161a1e"
  if (dayData.hasPain) return "#7a4a20"
  const ratio = maxVol > 0 ? dayData.volume / maxVol : 0
  if (ratio > 0.75) return "#2d7a3a"
  if (ratio > 0.5) return "#256d30"
  if (ratio > 0.25) return "#1e5a26"
  return "#194d20"
}

/** Build SVG heatmap string */
function buildHeatmapSVG(sessions: Record<string, SessionRecord>): string {
  const dayMap = buildDayMap(sessions)
  const maxVol = Math.max(0, ...Array.from(dayMap.values()).map((d) => d.volume))

  // Build 365-day grid starting from the Monday of the week 52 weeks ago
  const today = new Date()
  const todayISO_ = today.toISOString().slice(0, 10)

  // Start from 364 days ago aligned to Monday
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 364)
  // rewind to Monday
  const startDow = startDate.getUTCDay()
  startDate.setUTCDate(startDate.getUTCDate() - (startDow === 0 ? 6 : startDow - 1))

  const cellSize = 11
  const cellGap = 2
  const step = cellSize + cellGap
  const leftPad = 20 // for day labels
  const topPad = 20  // for month labels

  // Collect weeks
  const weeks: Array<Array<{ iso: string; dow: number }>> = []
  let currentWeek: Array<{ iso: string; dow: number }> = []
  const d = new Date(startDate)

  while (d <= today) {
    const dow = d.getUTCDay() // 0=Sun
    const iso = d.toISOString().slice(0, 10)
    // Monday=0 in our grid (Mon–Sun = rows 0–6)
    const row = dow === 0 ? 6 : dow - 1
    currentWeek.push({ iso, dow: row })
    if (dow === 0) {
      // Sunday closes the week
      weeks.push(currentWeek)
      currentWeek = []
    }
    d.setUTCDate(d.getUTCDate() + 1)
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  const svgWidth = leftPad + weeks.length * step + cellGap
  const svgHeight = topPad + 7 * step + 24 // 24px for legend

  // Month label positions
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  const monthLabels: Array<{ x: number; label: string }> = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const firstDay = week[0]
    if (!firstDay) return
    const m = new Date(`${firstDay.iso}T00:00:00Z`).getUTCMonth()
    if (m !== lastMonth) {
      monthLabels.push({ x: leftPad + wi * step, label: monthNames[m] ?? "" })
      lastMonth = m
    }
  })

  // Build SVG cells
  let cells = ""
  weeks.forEach((week, wi) => {
    const x = leftPad + wi * step
    for (const cell of week) {
      const y = topPad + cell.dow * step
      const data = dayMap.get(cell.iso)
      const fill = heatColor(data, maxVol)
      const isToday = cell.iso === todayISO_
      const stroke = isToday ? " stroke=\"#bf9b3e\" stroke-width=\"1\"" : ""
      const title = data
        ? `${cell.iso}: vol ${data.volume}${data.hasPain ? " ⚠ dolor" : ""}`
        : cell.iso
      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fill}"${stroke}><title>${title}</title></rect>`
    }
  })

  // Month labels
  let monthSVG = ""
  for (const ml of monthLabels) {
    monthSVG += `<text x="${ml.x}" y="13" fill="#7a7570" font-size="9" font-family="var(--font-display)">${ml.label}</text>`
  }

  // Day labels (L/M/V at rows 0,1,4 → Mon,Tue,Fri)
  const dayLabelRows: Array<{ row: number; label: string }> = [
    { row: 0, label: "L" },
    { row: 2, label: "M" },
    { row: 4, label: "V" },
  ]
  let dayLabelSVG = ""
  for (const dl of dayLabelRows) {
    const y = topPad + dl.row * step + cellSize - 1
    dayLabelSVG += `<text x="0" y="${y}" fill="#7a7570" font-size="9" font-family="var(--font-display)">${dl.label}</text>`
  }

  // Legend
  const legendY = topPad + 7 * step + 8
  const legendColors = ["#161a1e", "#194d20", "#1e5a26", "#256d30", "#2d7a3a", "#7a4a20"]
  const legendLabels = ["Sin datos", "Bajo", "Med-bajo", "Med-alto", "Alto", "Dolor"]
  let legendSVG = `<text x="${leftPad}" y="${legendY + 9}" fill="#7a7570" font-size="9" font-family="var(--font-display)">Menos</text>`
  let lx = leftPad + 36
  for (let li = 0; li < legendColors.length; li++) {
    legendSVG += `<rect x="${lx}" y="${legendY}" width="${cellSize}" height="${cellSize}" rx="2" fill="${legendColors[li]}"><title>${legendLabels[li]}</title></rect>`
    lx += step
  }
  legendSVG += `<text x="${lx + 2}" y="${legendY + 9}" fill="#7a7570" font-size="9" font-family="var(--font-display)">Más</text>`

  return `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">${monthSVG}${dayLabelSVG}${cells}${legendSVG}</svg>`
}

/** Build monthly bar chart SVG */
function buildMonthlyBarSVG(sessions: Record<string, SessionRecord>): string {
  const year = new Date().getFullYear()
  const monthCounts = new Array<number>(12).fill(0)
  for (const s of Object.values(sessions)) {
    if (s.date.startsWith(String(year))) {
      const m = parseInt(s.date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) monthCounts[m] = (monthCounts[m] ?? 0) + 1
    }
  }

  const maxCount = Math.max(1, ...monthCounts)
  const barW = 24
  const barGap = 6
  const chartH = 80
  const labelH = 16
  const svgW = 12 * (barW + barGap) + barGap
  const svgH = chartH + labelH

  const monthAbbr = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
  const currentMonth = new Date().getMonth()

  let bars = ""
  for (let i = 0; i < 12; i++) {
    const count = monthCounts[i] ?? 0
    const barH = count === 0 ? 2 : Math.max(4, Math.round((count / maxCount) * chartH))
    const x = barGap + i * (barW + barGap)
    const y = chartH - barH

    let fill: string
    if (count === 0) {
      fill = "#2a2a2a"
    } else if (count >= 12) {
      fill = "#3d8a5a" // green
    } else if (count >= 8) {
      fill = "#99723d" // orange
    } else {
      fill = "#bf9b3e" // accent
    }

    const isCurrent = i === currentMonth
    const stroke = isCurrent ? ` stroke="#bf9b3e" stroke-width="1"` : ""

    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${fill}"${stroke}><title>${monthAbbr[i]}: ${count} sesiones</title></rect>`
    bars += `<text x="${x + barW / 2}" y="${svgH - 2}" text-anchor="middle" fill="#7a7570" font-size="9" font-family="var(--font-display)">${monthAbbr[i]}</text>`
    if (count > 0) {
      bars += `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" fill="#d4cfc8" font-size="9" font-family="var(--font-display)">${count}</text>`
    }
  }

  return `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`
}

function buildActivityView(): HTMLElement {
  const view = document.createElement("div")
  view.className = "trk-view"
  view.id = "trk-view-activity"

  const state = getState()
  const data = state.getData()
  const sessions = data.sessions
  const phase = data.currentPhase

  // --- Stats bar ---
  const statsBar = document.createElement("div")
  statsBar.className = "trk-activity-stats"

  const yearSessions = sessionsThisYear(sessions).length
  const streak = computeStreak(sessions)
  const consistency = computeConsistency(sessions, phase)

  const statsData = [
    { label: `Sesiones ${new Date().getFullYear()}`, value: String(yearSessions) },
    { label: "Racha actual", value: `${streak} días` },
    { label: "Consistencia", value: `${consistency}%` },
  ]

  for (const stat of statsData) {
    const card = document.createElement("div")
    card.className = "trk-metric-card"
    const lbl = document.createElement("div")
    lbl.className = "trk-metric-card__label"
    lbl.textContent = stat.label
    const val = document.createElement("div")
    val.className = "trk-metric-card__value"
    val.textContent = stat.value
    card.appendChild(lbl)
    card.appendChild(val)
    statsBar.appendChild(card)
  }
  view.appendChild(statsBar)

  // --- Heatmap ---
  const heatSection = document.createElement("div")
  heatSection.className = "trk-activity-section"

  const heatTitle = document.createElement("div")
  heatTitle.className = "trk-activity-section__title"
  heatTitle.textContent = "Actividad — últimos 365 días"

  const heatScroll = document.createElement("div")
  heatScroll.className = "trk-activity-heatmap"
  heatScroll.innerHTML = buildHeatmapSVG(sessions)

  heatSection.appendChild(heatTitle)
  heatSection.appendChild(heatScroll)
  view.appendChild(heatSection)

  // --- Monthly chart ---
  const barSection = document.createElement("div")
  barSection.className = "trk-activity-section"

  const barTitle = document.createElement("div")
  barTitle.className = "trk-activity-section__title"
  barTitle.textContent = `Sesiones por mes — ${new Date().getFullYear()}`

  const barWrap = document.createElement("div")
  barWrap.className = "trk-activity-barchart"
  barWrap.innerHTML = buildMonthlyBarSVG(sessions)

  barSection.appendChild(barTitle)
  barSection.appendChild(barWrap)
  view.appendChild(barSection)

  // --- Personal Records ---
  const prSection = document.createElement("div")
  prSection.className = "trk-activity-section"

  const prTitle = document.createElement("div")
  prTitle.className = "trk-activity-section__title"
  prTitle.textContent = "Récords personales"

  prSection.appendChild(prTitle)

  const prList = document.createElement("div")
  prList.className = "trk-activity-pr-list"

  let hasPR = false
  for (const cfg of EXERCISE_CONFIGS) {
    const prRecords = data.prs[cfg.id]
    if (!prRecords || prRecords.length === 0) continue

    hasPR = true
    const best = prRecords.reduce(
      (max, pr) => (pr.value > max.value ? pr : max),
      prRecords[0] ?? { value: 0, date: "", unit: cfg.unit },
    )

    const row = document.createElement("div")
    row.className = "trk-activity-pr-row"

    const badge = document.createElement("span")
    badge.className = `trk-activity-pr-badge trk-activity-pr-badge--${cfg.cat}`
    badge.textContent = cfg.cat.toUpperCase()

    const name = document.createElement("span")
    name.className = "trk-activity-pr-name"
    name.textContent = cfg.label

    const val = document.createElement("span")
    val.className = "trk-activity-pr-value"
    val.textContent = `${best.value} ${cfg.unit}`

    const date = document.createElement("span")
    date.className = "trk-activity-pr-date"
    date.textContent = formatDate(best.date)

    row.appendChild(badge)
    row.appendChild(name)
    row.appendChild(val)
    row.appendChild(date)
    prList.appendChild(row)
  }

  if (!hasPR) {
    const empty = document.createElement("div")
    empty.className = "trk-activity-pr-empty"
    empty.textContent = "Sin récords registrados aún."
    prList.appendChild(empty)
  }

  prSection.appendChild(prList)
  view.appendChild(prSection)

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

export function renderActivity(): void {
  if (!rootEl) return

  const existing = document.getElementById("trk-view-activity")
  if (existing) existing.remove()

  const viewEl = buildActivityView()
  rootEl.querySelector(".trk-body")?.appendChild(viewEl)

  setActiveView("activity")
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

  const views: SubView[] = ["log", "week", "activity", "history"]
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
    case "activity":
      renderActivity()
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
    { label: "Actividad", view: "activity" },
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
        case "activity":
          renderActivity()
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
  const activityView = buildActivityView()
  const histView = buildHistoryView()

  body.appendChild(logView)
  body.appendChild(weekView)
  body.appendChild(activityView)
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
