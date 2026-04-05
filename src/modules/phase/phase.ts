import type { ExerciseId, Phase, PhaseExitCriteria, SessionRecord } from "@core/types"
import { EXERCISE_IDS, EXERCISE_UNITS, PHASES } from "@core/types"

// --- Phase labels and colors for UI ---

export const PHASE_LABELS: Record<Phase, string> = {
  [PHASES.ONE]: "Fase 1 — Base",
  [PHASES.TWO]: "Fase 2 — Desarrollo",
  [PHASES.THREE]: "Fase 3 — Fuerza",
  [PHASES.FOUR]: "Fase 4 — Élite",
}

export const PHASE_COLORS: Record<Phase, string> = {
  [PHASES.ONE]: "var(--green)",
  [PHASES.TWO]: "var(--blue)",
  [PHASES.THREE]: "var(--orange)",
  [PHASES.FOUR]: "var(--accent)",
}

// --- Phase exit criteria configs ---

export const PHASE_CONFIGS: PhaseExitCriteria[] = [
  // Phase 1 → Phase 2
  {
    phase: PHASES.ONE,
    requirements: [
      {
        exerciseId: EXERCISE_IDS.PUSH,
        minValue: 12,
        unit: EXERCISE_UNITS.REPS,
        description: "Push-ups: mínimo 12 reps",
      },
      {
        exerciseId: EXERCISE_IDS.ROW,
        minValue: 15,
        unit: EXERCISE_UNITS.REPS,
        description: "Rows: mínimo 15 reps",
      },
      {
        exerciseId: EXERCISE_IDS.PLANK,
        minValue: 40,
        unit: EXERCISE_UNITS.SECS,
        description: "Plank: mínimo 40 segs",
      },
      {
        exerciseId: EXERCISE_IDS.WALLSIT,
        minValue: 40,
        unit: EXERCISE_UNITS.SECS,
        description: "Wall sit: mínimo 40 segs",
      },
    ],
    consistencyWeeks: 2,
    consistencyPercent: 80,
  },

  // Phase 2 → Phase 3
  {
    phase: PHASES.TWO,
    requirements: [
      {
        exerciseId: EXERCISE_IDS.PUSH,
        minValue: 15,
        unit: EXERCISE_UNITS.REPS,
        description: "Push-ups: mínimo 15 reps",
      },
      {
        exerciseId: EXERCISE_IDS.ROW,
        minValue: 18,
        unit: EXERCISE_UNITS.REPS,
        description: "Rows: mínimo 18 reps",
      },
      {
        exerciseId: EXERCISE_IDS.PLANK,
        minValue: 60,
        unit: EXERCISE_UNITS.SECS,
        description: "Plank: mínimo 60 segs",
      },
      {
        exerciseId: EXERCISE_IDS.WALLSIT,
        minValue: 60,
        unit: EXERCISE_UNITS.SECS,
        description: "Wall sit: mínimo 60 segs",
      },
    ],
    consistencyWeeks: 2,
    consistencyPercent: 80,
  },

  // Phase 3 → Phase 4
  {
    phase: PHASES.THREE,
    requirements: [
      {
        exerciseId: EXERCISE_IDS.PUSH,
        minValue: 20,
        unit: EXERCISE_UNITS.REPS,
        description: "Push-ups: mínimo 20 reps",
      },
      {
        exerciseId: EXERCISE_IDS.ROW,
        minValue: 18,
        unit: EXERCISE_UNITS.REPS,
        description: "Rows: mínimo 18 reps",
      },
      {
        exerciseId: EXERCISE_IDS.PLANK,
        minValue: 75,
        unit: EXERCISE_UNITS.SECS,
        description: "Plank: mínimo 75 segs",
      },
      {
        exerciseId: EXERCISE_IDS.WALLSIT,
        minValue: 75,
        unit: EXERCISE_UNITS.SECS,
        description: "Wall sit: mínimo 75 segs",
      },
    ],
    consistencyWeeks: 4,
    consistencyPercent: 80,
  },
]

// --- Pure helper functions ---

/**
 * Returns the maximum value from a rounds array.
 * Returns 0 for empty arrays.
 */
export function getBestValue(rounds: number[]): number {
  if (rounds.length === 0) return 0
  return Math.max(...rounds)
}

/**
 * Returns the phase exit criteria for the given phase.
 * Returns null for Phase 4 (max phase — no exit criteria).
 */
export function getPhaseConfig(phase: Phase): PhaseExitCriteria | null {
  return PHASE_CONFIGS.find((c) => c.phase === phase) ?? null
}

/**
 * Parses an ISO date string (YYYY-MM-DD) and returns a Date at midnight UTC.
 */
function parseSessionDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`)
}

/**
 * Returns the Monday of the ISO week containing the given date.
 */
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 0 offset
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Returns an ISO string for a date (YYYY-MM-DD) given a Date object.
 */
function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Returns all session records within the last `weeksBack` ISO weeks,
 * grouped by week start (Monday ISO date → sessions in that week).
 */
function getSessionsByWeek(
  sessions: Record<string, SessionRecord>,
  weeksBack: number
): Map<string, SessionRecord[]> {
  const now = new Date()
  const thisWeekStart = startOfWeek(now)

  // Earliest week start we care about
  const cutoff = new Date(thisWeekStart)
  cutoff.setUTCDate(cutoff.getUTCDate() - (weeksBack - 1) * 7)

  const byWeek = new Map<string, SessionRecord[]>()

  for (const session of Object.values(sessions)) {
    const sessionDate = parseSessionDate(session.date)
    if (sessionDate < cutoff) continue

    const weekKey = toISODate(startOfWeek(sessionDate))
    const existing = byWeek.get(weekKey)
    if (existing) {
      existing.push(session)
    } else {
      byWeek.set(weekKey, [session])
    }
  }

  return byWeek
}

/**
 * Calculates the percentage of weeks (in the last `weeksBack` weeks) that
 * have at least `targetDaysPerWeek` training sessions.
 *
 * Returns a number from 0 to 100.
 */
export function getConsistencyPercent(
  sessions: Record<string, SessionRecord>,
  weeksBack: number,
  targetDaysPerWeek: number
): number {
  if (weeksBack <= 0) return 0

  const byWeek = getSessionsByWeek(sessions, weeksBack)

  let consistentWeeks = 0
  for (const weekSessions of byWeek.values()) {
    if (weekSessions.length >= targetDaysPerWeek) {
      consistentWeeks++
    }
  }

  return Math.round((consistentWeeks / weeksBack) * 100)
}

/**
 * Checks whether the given exercise meets its minimum value requirement
 * across ALL sessions within the provided week groups.
 */
function exerciseMeetsRequirement(
  sessionsByWeek: Map<string, SessionRecord[]>,
  exerciseId: ExerciseId,
  minValue: number
): boolean {
  // Collect all sessions from all weeks
  const allSessions: SessionRecord[] = []
  for (const weekSessions of sessionsByWeek.values()) {
    allSessions.push(...weekSessions)
  }

  if (allSessions.length === 0) return false

  // Every session that contains this exercise must meet the minimum
  const sessionsWithExercise = allSessions.filter(
    (s) => s.exercises[exerciseId] !== undefined
  )

  if (sessionsWithExercise.length === 0) return false

  return sessionsWithExercise.every((s) => {
    const rounds = s.exercises[exerciseId]
    if (!rounds || rounds.length === 0) return false
    return getBestValue(rounds) >= minValue
  })
}

/**
 * Detects whether the user has met all criteria to advance from `currentPhase`
 * to the next phase.
 *
 * Returns the next Phase if all criteria are satisfied, null otherwise.
 */
export function detectPhaseAdvancement(
  sessions: Record<string, SessionRecord>,
  currentPhase: Phase
): Phase | null {
  const config = getPhaseConfig(currentPhase)
  if (!config) return null // Phase 4 has no exit

  const { consistencyWeeks, consistencyPercent, requirements } = config

  // 1. Check consistency across the required window
  // Target: at least 3 days/week (reasonable training frequency)
  const TARGET_DAYS_PER_WEEK = 3
  const actualConsistency = getConsistencyPercent(
    sessions,
    consistencyWeeks,
    TARGET_DAYS_PER_WEEK
  )

  if (actualConsistency < consistencyPercent) return null

  // 2. Get sessions for the consistency window
  const sessionsByWeek = getSessionsByWeek(sessions, consistencyWeeks)

  // 3. Check every required exercise meets its minimum value
  for (const req of requirements) {
    if (!exerciseMeetsRequirement(sessionsByWeek, req.exerciseId, req.minValue)) {
      return null
    }
  }

  // All criteria met — return next phase
  return (currentPhase + 1) as Phase
}
