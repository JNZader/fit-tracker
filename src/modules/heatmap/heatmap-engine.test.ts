import { describe, expect, it } from "bun:test"
import type { SessionRecord } from "@core/types"
import type { MuscleId } from "./muscle-map"
import {
  calculateMuscleLoad,
  detectImbalances,
  getHeatLevel,
  getMuscleGroupSummary,
  getWeeklyMuscleProgress,
} from "./heatmap-engine"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(
  date: string,
  exercises: SessionRecord["exercises"],
): SessionRecord {
  return { date, exercises }
}

// ---------------------------------------------------------------------------
// calculateMuscleLoad
// ---------------------------------------------------------------------------
describe("calculateMuscleLoad", () => {
  it("returns all zeros for empty sessions", () => {
    const loads = calculateMuscleLoad([], 7)
    for (const value of loads.values()) {
      expect(value).toBe(0)
    }
    // Should have an entry for every muscle
    expect(loads.size).toBe(36)
  })

  it("calculates push-up load correctly (3 sets of 10)", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-04-10", { push: [10, 10, 10] }),
    ]
    const loads = calculateMuscleLoad(sessions, 7)

    // Primary muscles (weight 1.0): totalReps=30, load=30*1.0=30
    expect(loads.get("pectorals" as MuscleId)).toBe(30)
    expect(loads.get("anterior-deltoid" as MuscleId)).toBe(30)
    expect(loads.get("triceps" as MuscleId)).toBe(30)

    // Secondary (weight 0.5): 30*0.5=15
    expect(loads.get("serratus" as MuscleId)).toBe(15)

    // Stabilizer (weight 0.25): 30*0.25=7.5
    expect(loads.get("rectus-abdominis" as MuscleId)).toBe(7.5)
    expect(loads.get("quads" as MuscleId)).toBe(7.5)

    // Unrelated muscle should be 0
    expect(loads.get("biceps" as MuscleId)).toBe(0)
  })

  it("accumulates loads across multiple exercises", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-04-10", {
        push: [10, 10], // 20 total reps
        row: [8, 8],    // 16 total reps
      }),
    ]
    const loads = calculateMuscleLoad(sessions, 7)

    // Push: anterior-deltoid gets 20*1.0=20
    // Row: posterior-deltoid gets 16*1.0=16
    expect(loads.get("anterior-deltoid" as MuscleId)).toBe(20)
    expect(loads.get("posterior-deltoid" as MuscleId)).toBe(16)

    // Row: biceps secondary 16*0.5=8
    expect(loads.get("biceps" as MuscleId)).toBe(8)
  })

  it("accumulates loads across multiple sessions", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-04-09", { push: [10] }),
      makeSession("2026-04-10", { push: [10] }),
    ]
    const loads = calculateMuscleLoad(sessions, 7)

    // 10+10=20 total reps, pectorals primary → 20*1.0=20
    expect(loads.get("pectorals" as MuscleId)).toBe(20)
  })

  it("windowDays filters to last N days only", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-04-01", { push: [100] }), // >7 days ago from reference
      makeSession("2026-04-09", { push: [10] }),   // within 7 days
      makeSession("2026-04-10", { push: [10] }),   // within 7 days
    ]
    // windowDays=7 from the most recent session date (2026-04-10)
    const loads = calculateMuscleLoad(sessions, 7)

    // Only 10+10=20 reps counted (April 1st excluded)
    expect(loads.get("pectorals" as MuscleId)).toBe(20)
  })

  it("handles sessions with no exercises gracefully", () => {
    const sessions: SessionRecord[] = [makeSession("2026-04-10", {})]
    const loads = calculateMuscleLoad(sessions, 7)
    for (const value of loads.values()) {
      expect(value).toBe(0)
    }
  })
})

// ---------------------------------------------------------------------------
// getHeatLevel
// ---------------------------------------------------------------------------
describe("getHeatLevel", () => {
  it("returns 0 for zero volume", () => {
    expect(getHeatLevel(0, 100)).toBe(0)
  })

  it("returns 0 when maxLoad is 0", () => {
    expect(getHeatLevel(0, 0)).toBe(0)
  })

  it("returns 1 at 25% of max", () => {
    expect(getHeatLevel(25, 100)).toBe(1)
  })

  it("returns 1 for low load (1-25%)", () => {
    expect(getHeatLevel(1, 100)).toBe(1)
    expect(getHeatLevel(24, 100)).toBe(1)
  })

  it("returns 2 at 50% of max", () => {
    expect(getHeatLevel(50, 100)).toBe(2)
  })

  it("returns 2 for moderate load (26-50%)", () => {
    expect(getHeatLevel(26, 100)).toBe(2)
    expect(getHeatLevel(49, 100)).toBe(2)
  })

  it("returns 3 at 75% of max", () => {
    expect(getHeatLevel(75, 100)).toBe(3)
  })

  it("returns 3 for high load (51-75%)", () => {
    expect(getHeatLevel(51, 100)).toBe(3)
    expect(getHeatLevel(74, 100)).toBe(3)
  })

  it("returns 4 at 100% of max", () => {
    expect(getHeatLevel(100, 100)).toBe(4)
  })

  it("returns 4 for intense load (76-100%)", () => {
    expect(getHeatLevel(76, 100)).toBe(4)
    expect(getHeatLevel(99, 100)).toBe(4)
  })

  it("clamps to 4 when load exceeds max", () => {
    expect(getHeatLevel(150, 100)).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// detectImbalances
// ---------------------------------------------------------------------------
describe("detectImbalances", () => {
  it("detects overTrained muscles (>1.5x baseline)", () => {
    const current = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 200],
      ["biceps" as MuscleId, 50],
    ])
    const baseline = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
      ["biceps" as MuscleId, 50],
    ])
    const result = detectImbalances(current, baseline)
    expect(result.overTrained).toContain("pectorals")
    expect(result.balanced).toContain("biceps")
  })

  it("detects underTrained muscles (<0.5x baseline)", () => {
    const current = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 20],
      ["biceps" as MuscleId, 100],
    ])
    const baseline = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
      ["biceps" as MuscleId, 100],
    ])
    const result = detectImbalances(current, baseline)
    expect(result.underTrained).toContain("pectorals")
    expect(result.balanced).toContain("biceps")
  })

  it("classifies balanced muscles correctly", () => {
    const current = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
      ["biceps" as MuscleId, 120],
      ["triceps" as MuscleId, 80],
    ])
    const baseline = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
      ["biceps" as MuscleId, 100],
      ["triceps" as MuscleId, 100],
    ])
    const result = detectImbalances(current, baseline)
    expect(result.balanced).toContain("pectorals")
    expect(result.balanced).toContain("biceps")
    expect(result.balanced).toContain("triceps")
    expect(result.overTrained).toHaveLength(0)
    expect(result.underTrained).toHaveLength(0)
  })

  it("supports configurable threshold", () => {
    const current = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 130],
    ])
    const baseline = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
    ])
    // Default threshold 1.5 → 130 is balanced
    const defaultResult = detectImbalances(current, baseline)
    expect(defaultResult.balanced).toContain("pectorals")

    // Threshold 1.2 → 130 is overTrained (130/100=1.3 > 1.2)
    const strictResult = detectImbalances(current, baseline, 1.2)
    expect(strictResult.overTrained).toContain("pectorals")
  })

  it("handles muscles in current but not in baseline", () => {
    const current = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 50],
    ])
    const baseline = new Map<MuscleId, number>()
    // No baseline = no comparison possible, treat as balanced
    const result = detectImbalances(current, baseline)
    expect(result.overTrained).toHaveLength(0)
    expect(result.underTrained).toHaveLength(0)
  })

  it("handles muscles in baseline but not in current", () => {
    const current = new Map<MuscleId, number>()
    const baseline = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 100],
    ])
    const result = detectImbalances(current, baseline)
    expect(result.underTrained).toContain("pectorals")
  })
})

// ---------------------------------------------------------------------------
// getWeeklyMuscleProgress
// ---------------------------------------------------------------------------
describe("getWeeklyMuscleProgress", () => {
  it("returns empty array for no sessions", () => {
    const result = getWeeklyMuscleProgress([], 4)
    expect(result).toEqual([])
  })

  it("groups sessions by ISO week", () => {
    const sessions: SessionRecord[] = [
      // Week 15 of 2026 (Mon Apr 6 - Sun Apr 12)
      makeSession("2026-04-06", { push: [10] }),
      makeSession("2026-04-07", { push: [10] }),
      // Week 16 of 2026 (Mon Apr 13 - Sun Apr 19)
      makeSession("2026-04-13", { push: [10] }),
    ]
    const result = getWeeklyMuscleProgress(sessions, 4)
    expect(result.length).toBe(2)

    // Week 15: 20 reps total → pectorals 20*1.0=20
    expect(result[0]!.loads.get("pectorals" as MuscleId)).toBe(20)
    // Week 16: 10 reps → pectorals 10*1.0=10
    expect(result[1]!.loads.get("pectorals" as MuscleId)).toBe(10)
  })

  it("limits to last N weeks", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-03-01", { push: [10] }), // ~5 weeks ago
      makeSession("2026-04-06", { push: [10] }),  // week 15
      makeSession("2026-04-10", { push: [10] }),  // week 15
    ]
    const result = getWeeklyMuscleProgress(sessions, 2)
    // Only last 2 weeks should be included
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it("each entry has a weekStart date string", () => {
    const sessions: SessionRecord[] = [
      makeSession("2026-04-08", { push: [10] }),
    ]
    const result = getWeeklyMuscleProgress(sessions, 4)
    expect(result.length).toBe(1)
    expect(typeof result[0]!.weekStart).toBe("string")
    // Week start should be the Monday of that week
    expect(result[0]!.weekStart).toBe("2026-04-06")
  })
})

// ---------------------------------------------------------------------------
// getMuscleGroupSummary
// ---------------------------------------------------------------------------
describe("getMuscleGroupSummary", () => {
  it("aggregates loads by body region", () => {
    const loads = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 30],
      ["pectorals-minor" as MuscleId, 10],
      ["biceps" as MuscleId, 20],
      ["triceps" as MuscleId, 15],
    ])
    const summary = getMuscleGroupSummary(loads)

    // Chest: pectorals(30) + pectorals-minor(10) = 40
    expect(summary.chest.total).toBe(40)
    expect(summary.chest.muscleCount).toBe(2)
    expect(summary.chest.average).toBe(20)

    // Arms: biceps(20) + triceps(15) = 35
    expect(summary.arms.total).toBe(35)
    expect(summary.arms.muscleCount).toBe(2)
    expect(summary.arms.average).toBe(17.5)
  })

  it("returns all regions even if some have zero load", () => {
    const loads = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 30],
    ])
    const summary = getMuscleGroupSummary(loads)

    expect(summary).toHaveProperty("chest")
    expect(summary).toHaveProperty("back")
    expect(summary).toHaveProperty("arms")
    expect(summary).toHaveProperty("legs")
    expect(summary).toHaveProperty("core")
    expect(summary).toHaveProperty("shoulders")
  })

  it("handles empty loads map", () => {
    const loads = new Map<MuscleId, number>()
    const summary = getMuscleGroupSummary(loads)

    for (const region of Object.values(summary)) {
      expect(region.total).toBe(0)
      expect(region.average).toBe(0)
      expect(region.muscleCount).toBe(0)
    }
  })

  it("counts only muscles with non-zero load", () => {
    const loads = new Map<MuscleId, number>([
      ["pectorals" as MuscleId, 30],
      ["pectorals-minor" as MuscleId, 0],
    ])
    const summary = getMuscleGroupSummary(loads)
    // Only pectorals has load, pectorals-minor is 0
    expect(summary.chest.muscleCount).toBe(1)
    expect(summary.chest.total).toBe(30)
    expect(summary.chest.average).toBe(30)
  })
})
