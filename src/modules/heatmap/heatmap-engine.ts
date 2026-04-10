import type { SessionRecord, ExerciseId } from "@core/types"
import {
  EXERCISE_MUSCLE_MAP,
  MUSCLES,
  MUSCLE_IDS,
  type MuscleId,
  type MuscleInfo,
} from "./muscle-map"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface ImbalanceResult {
  overTrained: MuscleId[]
  underTrained: MuscleId[]
  balanced: MuscleId[]
}

export interface WeeklyProgress {
  weekStart: string
  loads: Map<MuscleId, number>
}

export interface RegionSummary {
  total: number
  average: number
  muscleCount: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
const ALL_MUSCLE_IDS = Object.values(MUSCLE_IDS) as MuscleId[]

function emptyLoadsMap(): Map<MuscleId, number> {
  const map = new Map<MuscleId, number>()
  for (const id of ALL_MUSCLE_IDS) {
    map.set(id, 0)
  }
  return map
}

function sumSets(sets: number[]): number {
  let total = 0
  for (const s of sets) total += s
  return total
}

/** Returns the Monday (ISO week start) for a given date string YYYY-MM-DD */
function getISOWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// calculateMuscleLoad
// ---------------------------------------------------------------------------
/**
 * Sums (totalReps × muscleWeight) for each muscle across sessions within the
 * last `windowDays` days (relative to the most recent session date).
 */
export function calculateMuscleLoad(
  sessions: SessionRecord[],
  windowDays: number,
): Map<MuscleId, number> {
  const loads = emptyLoadsMap()

  if (sessions.length === 0) return loads

  // Find the most recent session date as reference point
  let maxDate = ""
  for (const s of sessions) {
    if (s.date > maxDate) maxDate = s.date
  }

  const refDate = new Date(`${maxDate}T00:00:00Z`)
  const cutoff = new Date(refDate)
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays + 1)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  for (const session of sessions) {
    if (session.date < cutoffStr) continue

    for (const [exerciseId, sets] of Object.entries(session.exercises)) {
      if (!sets || sets.length === 0) continue

      const totalReps = sumSets(sets)
      const activations = EXERCISE_MUSCLE_MAP[exerciseId as ExerciseId]
      if (!activations) continue

      for (const act of activations) {
        const current = loads.get(act.muscleId) ?? 0
        loads.set(act.muscleId, current + totalReps * act.weight)
      }
    }
  }

  return loads
}

// ---------------------------------------------------------------------------
// getHeatLevel
// ---------------------------------------------------------------------------
/**
 * Maps a load value to a heat level 0-4 based on percentage of maxLoad.
 *  0 = none (0%)
 *  1 = low (1-25%)
 *  2 = moderate (26-50%)
 *  3 = high (51-75%)
 *  4 = intense (76%+)
 */
export function getHeatLevel(load: number, maxLoad: number): HeatLevel {
  if (maxLoad <= 0 || load <= 0) return 0

  const pct = (load / maxLoad) * 100

  if (pct <= 25) return 1
  if (pct <= 50) return 2
  if (pct <= 75) return 3
  return 4
}

// ---------------------------------------------------------------------------
// detectImbalances
// ---------------------------------------------------------------------------
/**
 * Compares current muscle loads against a baseline window.
 * - ratio > threshold → overTrained
 * - ratio < 1/threshold → underTrained
 * - otherwise → balanced
 *
 * Muscles only in current (no baseline) are skipped.
 * Muscles only in baseline (no current / 0 current) are underTrained.
 */
export function detectImbalances(
  currentLoads: Map<MuscleId, number>,
  baselineLoads: Map<MuscleId, number>,
  threshold = 1.5,
): ImbalanceResult {
  const overTrained: MuscleId[] = []
  const underTrained: MuscleId[] = []
  const balanced: MuscleId[] = []

  // Collect all muscles that appear in either map
  const allMuscles = new Set<MuscleId>([
    ...currentLoads.keys(),
    ...baselineLoads.keys(),
  ])

  for (const muscleId of allMuscles) {
    const current = currentLoads.get(muscleId) ?? 0
    const baseline = baselineLoads.get(muscleId) ?? 0

    // No baseline reference → can't compare
    if (baseline <= 0 && current <= 0) continue
    if (baseline <= 0) continue // new muscle, no baseline to compare

    if (current <= 0) {
      // Had baseline but no current activity
      underTrained.push(muscleId)
      continue
    }

    const ratio = current / baseline

    if (ratio > threshold) {
      overTrained.push(muscleId)
    } else if (ratio < 1 / threshold) {
      underTrained.push(muscleId)
    } else {
      balanced.push(muscleId)
    }
  }

  return { overTrained, underTrained, balanced }
}

// ---------------------------------------------------------------------------
// getWeeklyMuscleProgress
// ---------------------------------------------------------------------------
/**
 * Groups sessions into ISO weeks and calculates per-muscle loads for each week.
 * Returns the last `weeks` weeks, sorted chronologically.
 */
export function getWeeklyMuscleProgress(
  sessions: SessionRecord[],
  weeks: number,
): WeeklyProgress[] {
  if (sessions.length === 0) return []

  // Group sessions by ISO week start
  const weekMap = new Map<string, SessionRecord[]>()

  for (const session of sessions) {
    const weekStart = getISOWeekStart(session.date)
    const existing = weekMap.get(weekStart)
    if (existing) {
      existing.push(session)
    } else {
      weekMap.set(weekStart, [session])
    }
  }

  // Sort week keys chronologically
  const sortedWeeks = [...weekMap.keys()].sort()

  // Take last N weeks
  const lastNWeeks = sortedWeeks.slice(-weeks)

  const result: WeeklyProgress[] = []

  for (const weekStart of lastNWeeks) {
    const weekSessions = weekMap.get(weekStart)!
    // Use a large window (7 days) but since all sessions are in the same week,
    // we just calculate loads for all of them
    const loads = emptyLoadsMap()

    for (const session of weekSessions) {
      for (const [exerciseId, sets] of Object.entries(session.exercises)) {
        if (!sets || sets.length === 0) continue

        const totalReps = sumSets(sets)
        const activations = EXERCISE_MUSCLE_MAP[exerciseId as ExerciseId]
        if (!activations) continue

        for (const act of activations) {
          const current = loads.get(act.muscleId) ?? 0
          loads.set(act.muscleId, current + totalReps * act.weight)
        }
      }
    }

    result.push({ weekStart, loads })
  }

  return result
}

// ---------------------------------------------------------------------------
// getMuscleGroupSummary
// ---------------------------------------------------------------------------
/**
 * Aggregates muscle loads by body region from MUSCLES registry.
 * Only counts muscles with non-zero load in muscleCount and average.
 */
export function getMuscleGroupSummary(
  loads: Map<MuscleId, number>,
): Record<MuscleInfo["region"], RegionSummary> {
  const regions: MuscleInfo["region"][] = [
    "chest",
    "back",
    "arms",
    "legs",
    "core",
    "shoulders",
  ]

  const summary = {} as Record<MuscleInfo["region"], RegionSummary>

  for (const region of regions) {
    summary[region] = { total: 0, average: 0, muscleCount: 0 }
  }

  for (const [muscleId, load] of loads.entries()) {
    const info = MUSCLES[muscleId]
    if (!info) continue

    if (load > 0) {
      summary[info.region].total += load
      summary[info.region].muscleCount += 1
    }
  }

  // Calculate averages
  for (const region of regions) {
    const s = summary[region]
    s.average = s.muscleCount > 0 ? s.total / s.muscleCount : 0
  }

  return summary
}
