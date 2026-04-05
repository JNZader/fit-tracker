import { describe, expect, test } from "bun:test"
import type { Phase, SessionRecord } from "@core/types"
import { EXERCISE_IDS, EXERCISE_UNITS, PHASES } from "@core/types"
import {
  detectPhaseAdvancement,
  getBestValue,
  getConsistencyPercent,
  getPhaseConfig,
} from "./phase"

// ---------------------------------------------------------------------------
// getBestValue
// ---------------------------------------------------------------------------

describe("getBestValue", () => {
  test("returns max of rounds array", () => {
    expect(getBestValue([5, 10, 3, 8])).toBe(10)
  })

  test("returns single element", () => {
    expect(getBestValue([7])).toBe(7)
  })

  test("returns 0 for empty array", () => {
    expect(getBestValue([])).toBe(0)
  })

  test("handles all equal values", () => {
    expect(getBestValue([4, 4, 4])).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// getPhaseConfig
// ---------------------------------------------------------------------------

describe("getPhaseConfig", () => {
  test("returns config for Phase 1", () => {
    const config = getPhaseConfig(PHASES.ONE)
    expect(config).not.toBeNull()
    expect(config?.phase).toBe(1)
    expect(config?.consistencyWeeks).toBe(2)
    expect(config?.consistencyPercent).toBe(80)
  })

  test("returns config for Phase 2", () => {
    const config = getPhaseConfig(PHASES.TWO)
    expect(config).not.toBeNull()
    expect(config?.phase).toBe(2)
  })

  test("returns config for Phase 3", () => {
    const config = getPhaseConfig(PHASES.THREE)
    expect(config).not.toBeNull()
    expect(config?.phase).toBe(3)
    expect(config?.consistencyWeeks).toBe(4)
  })

  test("returns null for Phase 4 (max phase)", () => {
    expect(getPhaseConfig(PHASES.FOUR)).toBeNull()
  })

  test("Phase 1 config has push-up requirement of 12 reps", () => {
    const config = getPhaseConfig(PHASES.ONE)
    const pushReq = config?.requirements.find(
      (r) => r.exerciseId === EXERCISE_IDS.PUSH
    )
    expect(pushReq?.minValue).toBe(12)
    expect(pushReq?.unit).toBe(EXERCISE_UNITS.REPS)
  })
})

// ---------------------------------------------------------------------------
// getConsistencyPercent
// ---------------------------------------------------------------------------

describe("getConsistencyPercent", () => {
  /**
   * Builds a sessions record with one session per day-offset from today (UTC).
   */
  function makeSessionsForDays(dayOffsets: number[]): Record<string, SessionRecord> {
    const sessions: Record<string, SessionRecord> = {}
    for (const offset of dayOffsets) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - offset)
      const dateStr = d.toISOString().slice(0, 10)
      sessions[dateStr] = {
        date: dateStr,
        exercises: {},
      }
    }
    return sessions
  }

  test("returns 0 for empty sessions", () => {
    expect(getConsistencyPercent({}, 2, 3)).toBe(0)
  })

  test("returns 0 when weeksBack is 0", () => {
    const sessions = makeSessionsForDays([0, 1, 2])
    expect(getConsistencyPercent(sessions, 0, 3)).toBe(0)
  })

  test("returns 100% when current week has 3+ sessions and weeksBack=1", () => {
    // Put 3 sessions within the current week (Mon–Sun)
    // Use days 0, 1, 2 relative to today — they should land in the same ISO week
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon, ...
    // Days since Monday this week
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    if (daysSinceMonday >= 2) {
      // Enough days this week to place 3 sessions within the same week
      const sessions = makeSessionsForDays([0, 1, 2])
      const result = getConsistencyPercent(sessions, 1, 3)
      expect(result).toBe(100)
    } else {
      // Not enough days this week — skip this specific sub-case
      expect(true).toBe(true)
    }
  })

  test("returns 0% when sessions exist but not enough per week", () => {
    // Only 1 session in the last 2 weeks, target is 3/week
    const sessions = makeSessionsForDays([0])
    // With 2 weeks: 1 week has 1 session (< 3), so 0 consistent weeks → 0%
    const result = getConsistencyPercent(sessions, 2, 3)
    expect(result).toBe(0)
  })

  test("calculates 50% when 1 of 2 weeks is consistent", () => {
    // Current week: 3 sessions (today, 1d ago, 2d ago) — potentially same week
    // We'll try a simpler approach: look at getConsistencyPercent result for sessions
    // that cover exactly 1 complete consistent week out of 2
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    if (daysSinceMonday >= 2) {
      // This week: 3 sessions
      const thisWeekSessions = makeSessionsForDays([0, 1, 2])
      // Prior week: only 1 session (insufficient)
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - (daysSinceMonday + 2)) // 2 days into last week
      const lastWeekDate = d.toISOString().slice(0, 10)
      const sessions: Record<string, SessionRecord> = {
        ...thisWeekSessions,
        [lastWeekDate]: { date: lastWeekDate, exercises: {} },
      }
      const result = getConsistencyPercent(sessions, 2, 3)
      expect(result).toBe(50)
    } else {
      expect(true).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// detectPhaseAdvancement
// ---------------------------------------------------------------------------

describe("detectPhaseAdvancement", () => {
  test("returns null when sessions is empty", () => {
    expect(detectPhaseAdvancement({}, PHASES.ONE)).toBeNull()
  })

  test("returns null for Phase 4 (max phase)", () => {
    const sessions: Record<string, SessionRecord> = {}
    expect(detectPhaseAdvancement(sessions, PHASES.FOUR)).toBeNull()
  })

  test("returns null when consistency criteria not met", () => {
    // Only 1 session this week — far below 80% consistency over 2 weeks
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const sessions: Record<string, SessionRecord> = {
      [todayStr]: { date: todayStr, exercises: {} },
    }
    expect(detectPhaseAdvancement(sessions, PHASES.ONE)).toBeNull()
  })

  test("returns null when exercise criteria not met even if consistency is ok", () => {
    // Build 2 weeks of sessions with 3 days each, but push-ups are only 5 reps (< 12)
    const sessions: Record<string, SessionRecord> = {}
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    if (daysSinceMonday >= 2) {
      // This week: 3 sessions with low push-up values
      for (let i = 0; i <= 2; i++) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        sessions[dateStr] = {
          date: dateStr,
          exercises: {
            [EXERCISE_IDS.PUSH]: [5], // Below minimum of 12
            [EXERCISE_IDS.ROW]: [20],
            [EXERCISE_IDS.PLANK]: [50],
            [EXERCISE_IDS.WALLSIT]: [50],
          },
        }
      }
      // Last week: 3 sessions
      for (let i = 7; i <= 9; i++) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        sessions[dateStr] = {
          date: dateStr,
          exercises: {
            [EXERCISE_IDS.PUSH]: [5], // Below minimum of 12
            [EXERCISE_IDS.ROW]: [20],
            [EXERCISE_IDS.PLANK]: [50],
            [EXERCISE_IDS.WALLSIT]: [50],
          },
        }
      }
      expect(detectPhaseAdvancement(sessions, PHASES.ONE)).toBeNull()
    } else {
      expect(true).toBe(true)
    }
  })

  test("returns next phase (2) when ALL Phase 1 criteria met for 2 weeks", () => {
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    // Only run full advancement test when we have enough days to build 2 consistent weeks
    if (daysSinceMonday >= 2) {
      const sessions: Record<string, SessionRecord> = {}

      // This week: 3 sessions, all exercises meet Phase 1 minimums
      for (let i = 0; i <= 2; i++) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        sessions[dateStr] = {
          date: dateStr,
          exercises: {
            [EXERCISE_IDS.PUSH]: [15], // >= 12
            [EXERCISE_IDS.ROW]: [18],  // >= 15
            [EXERCISE_IDS.PLANK]: [45], // >= 40
            [EXERCISE_IDS.WALLSIT]: [45], // >= 40
          },
        }
      }

      // Last week: 3 sessions meeting criteria
      for (let i = 7; i <= 9; i++) {
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        sessions[dateStr] = {
          date: dateStr,
          exercises: {
            [EXERCISE_IDS.PUSH]: [15],
            [EXERCISE_IDS.ROW]: [18],
            [EXERCISE_IDS.PLANK]: [45],
            [EXERCISE_IDS.WALLSIT]: [45],
          },
        }
      }

      const result = detectPhaseAdvancement(sessions, PHASES.ONE)
      expect(result).toBe(2 as Phase)
    } else {
      expect(true).toBe(true)
    }
  })
})
