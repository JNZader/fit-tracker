import { navigateTo } from "@core/router"
import { AppState } from "@core/state"
import { loadData } from "@core/storage"
import type { ExerciseId, Phase, SessionRecord } from "@core/types"
import { EXERCISE_IDS } from "@core/types"
import "./home.css"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface ExerciseInfo {
  id: ExerciseId
  label: string
  unit: "reps" | "secs"
  color: string
}

const EXERCISES: ExerciseInfo[] = [
  { id: EXERCISE_IDS.PUSH, label: "Push-ups", unit: "reps", color: "#c4944a" },
  { id: EXERCISE_IDS.ROW, label: "Remo", unit: "reps", color: "#5a8abf" },
  { id: EXERCISE_IDS.BRIDGE, label: "Glute Bridge", unit: "reps", color: "#4a9a6a" },
  { id: EXERCISE_IDS.PLANK, label: "Plank", unit: "secs", color: "#b5a84a" },
  { id: EXERCISE_IDS.WALLSIT, label: "Wall Sit", unit: "secs", color: "#4a9a6a" },
  { id: EXERCISE_IDS.BIRDDOG, label: "Bird-Dog", unit: "reps", color: "#b5a84a" },
]

const WEEKLY_TARGET: Record<Phase, number> = { 1: 3, 2: 4, 3: 5, 4: 5 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = d.getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

function sessionVolume(session: SessionRecord): number {
  let total = 0
  for (const rounds of Object.values(session.exercises ?? {})) {
    if (rounds) for (const v of rounds) total += v
  }
  return total
}

function weekSessions(sessions: Record<string, SessionRecord>, wk: string): SessionRecord[] {
  return Object.entries(sessions)
    .filter(([date]) => weekStart(date) === wk)
    .map(([, s]) => s)
}

function calcStreak(sessions: Record<string, SessionRecord>): number {
  let streak = 0
  let d = todayISO()
  while (sessions[d]) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

function daysAgo(iso: string): number {
  const today = new Date(`${todayISO()}T00:00:00Z`)
  const then = new Date(`${iso}T00:00:00Z`)
  return Math.round((today.getTime() - then.getTime()) / 86400000)
}

function getBest(sessions: Record<string, SessionRecord>, exId: ExerciseId): number {
  let best = 0
  for (const session of Object.values(sessions)) {
    const rounds = session.exercises?.[exId] ?? []
    for (const v of rounds) {
      if (v > best) best = v
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Semaphore
// ---------------------------------------------------------------------------

type SemColor = "g" | "y" | "r"

interface SemResult {
  color: SemColor
  decision: string
  decisionDesc: string
}

const SEM_STYLE: Record<SemColor, { color: string; bg: string }> = {
  g: { color: "var(--green)", bg: "var(--green-bg)" },
  y: { color: "var(--orange)", bg: "var(--orange-bg)" },
  r: { color: "var(--red)", bg: "var(--red-bg)" },
}

const SEM_DECISION: Record<SemColor, { decision: string; desc: string }> = {
  g: { decision: "SUBIR", desc: "+5-8% volumen" },
  y: { decision: "MANTENER", desc: "Mismo volumen" },
  r: { decision: "BAJAR", desc: "-15% o deload" },
}

function calcSemaphore(sessions: Record<string, SessionRecord>): SemResult {
  const today = todayISO()
  const thisWk = weekStart(today)
  const prevWk = weekStart(addDays(thisWk, -7))

  const thisSessions = weekSessions(sessions, thisWk)
  const prevSessions = weekSessions(sessions, prevWk)

  const tv = thisSessions.reduce((s, sess) => s + sessionVolume(sess), 0)
  const pv = prevSessions.reduce((s, sess) => s + sessionVolume(sess), 0)
  const deltaVol = pv > 0 ? Math.round(((tv - pv) / pv) * 100) : 0

  const rpeVals = thisSessions.filter((s) => s.rpe != null).map((s) => s.rpe as number)
  const avgRpe = rpeVals.length > 0 ? rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length : 0
  const painDays = thisSessions.filter((s) => s.pain != null && s.pain !== "No").length

  const semVol: SemColor = Math.abs(deltaVol) < 5 ? "g" : Math.abs(deltaVol) <= 10 ? "y" : "r"
  const semRpe: SemColor = avgRpe === 0 || avgRpe <= 7 ? "g" : avgRpe <= 7.5 ? "y" : "r"
  const semPain: SemColor = painDays === 0 ? "g" : painDays === 1 ? "y" : "r"

  const colors: SemColor[] = [semVol, semRpe, semPain]
  const overall: SemColor = colors.includes("r") ? "r" : colors.includes("y") ? "y" : "g"

  return {
    color: overall,
    decision: SEM_DECISION[overall].decision,
    decisionDesc: SEM_DECISION[overall].desc,
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render(container: HTMLElement): void {
  const data = loadData()
  const sessions = data.sessions
  const today = todayISO()
  const todaySession: SessionRecord | undefined = sessions[today]
  const phase = data.currentPhase
  const weekTarget = WEEKLY_TARGET[phase]

  const thisWk = weekStart(today)
  const thisWeekCount = weekSessions(sessions, thisWk).length
  const streak = calcStreak(sessions)
  const sem = calcSemaphore(sessions)
  const semStyle = SEM_STYLE[sem.color]

  // Last session (not today)
  const lastDate = Object.keys(sessions)
    .filter((d) => d < today)
    .sort()
    .at(-1)
  const lastSession: SessionRecord | undefined = lastDate != null ? sessions[lastDate] : undefined

  // Week number
  const allDates = Object.keys(sessions).sort()
  const firstDate = allDates.at(0)
  let weekNum = 1
  if (firstDate != null) {
    const diff = new Date(`${today}T00:00:00Z`).getTime() - new Date(`${firstDate}T00:00:00Z`).getTime()
    weekNum = Math.max(1, Math.floor(diff / (7 * 86400000)) + 1)
  }

  const trained = todaySession != null
  const todayVol = trained && todaySession != null ? sessionVolume(todaySession) : 0

  let html = ""

  // Status card
  html += `<div class="home-status ${trained ? "home-status--trained" : "home-status--not-trained"}">`
  html += `<div class="home-status__label">${trained ? "✓ YA ENTRENASTE HOY" : "HOY NO ENTRENASTE"}</div>`
  if (trained && todaySession != null) {
    const parts: string[] = [`${todayVol} reps`]
    if (todaySession.rpe != null) parts.push(`RPE ${todaySession.rpe}`)
    if (todaySession.feeling != null) parts.push(`Sensación ${todaySession.feeling}/5`)
    html += `<div class="home-status__sub">${parts.join(" · ")}</div>`
    html += `<button class="home-status__cta home-status__cta--secondary" data-action="goto-tracking">Ver detalles →</button>`
  } else {
    html += `<button class="home-status__cta" data-action="goto-tracking">+ Registrar sesión hoy</button>`
  }
  html += "</div>"

  // Meta grid
  html += '<div class="home-meta">'
  html += `<div class="home-stat">
    <div class="home-stat__label">Fase</div>
    <div class="home-stat__value" style="color:var(--accent)">F${phase}</div>
    <div class="home-stat__sub">Semana ${weekNum}</div>
  </div>`
  html += `<div class="home-stat">
    <div class="home-stat__label">Racha</div>
    <div class="home-stat__value" style="color:var(--green)">${streak}</div>
    <div class="home-stat__sub">días</div>
  </div>`
  html += `<div class="home-stat">
    <div class="home-stat__label">Esta semana</div>
    <div class="home-stat__value" style="color:${thisWeekCount >= weekTarget ? "var(--green)" : "var(--text)"}">${thisWeekCount}</div>
    <div class="home-stat__sub">de ${weekTarget} sesiones</div>
  </div>`
  html += `<div class="home-stat" style="background:${semStyle.bg};border-color:${semStyle.color}">
    <div class="home-stat__label">Semáforo</div>
    <div class="home-stat__value" style="color:${semStyle.color};font-size:0.95rem">${sem.decision}</div>
    <div class="home-stat__sub" style="color:${semStyle.color}">${sem.decisionDesc}</div>
  </div>`
  html += "</div>"

  // Last session
  if (lastSession != null && lastDate != null) {
    const ago = daysAgo(lastDate)
    html += `<div class="home-last">
      <div class="home-last__title">Última sesión — hace ${ago} día${ago === 1 ? "" : "s"}</div>
      <div class="home-last__details">`
    for (const ex of EXERCISES) {
      const rounds = lastSession.exercises?.[ex.id] ?? []
      const total = rounds.reduce((a, b) => a + b, 0)
      if (total > 0) {
        html += `<span class="home-last__ex" style="color:${ex.color}">${ex.label}: <strong>${total}</strong></span>`
      }
    }
    html += "</div></div>"
  }

  // PRs
  const prEntries = EXERCISES.map((ex) => ({ ex, best: getBest(sessions, ex.id) })).filter((e) => e.best > 0)
  if (prEntries.length > 0) {
    html += `<div class="home-prs">
      <div class="home-prs__title">Récords personales</div>
      <div class="home-prs__grid">`
    for (const { ex, best } of prEntries) {
      html += `<div class="home-pr-card">
        <div class="home-pr-card__name" style="color:${ex.color}">${ex.label}</div>
        <div class="home-pr-card__value">${best}<span class="home-pr-card__unit">${ex.unit === "secs" ? "s" : ""}</span></div>
      </div>`
    }
    html += "</div></div>"
  }

  container.innerHTML = html

  container.querySelectorAll<HTMLButtonElement>("[data-action='goto-tracking']").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo("tracking")
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init(container: HTMLElement): void {
  render(container)

  const state = AppState.getInstance()
  state.on("session:saved", () => {
    render(container)
  })
  state.on("session:deleted", () => {
    render(container)
  })
  state.on("phase:changed", () => {
    render(container)
  })
}
