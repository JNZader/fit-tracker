import { describe, expect, test } from "bun:test"
import type { PRRecord } from "@core/types"
import { EXERCISE_IDS, EXERCISE_UNITS } from "@core/types"
import { runPRDetection } from "./pr-board"

const PUSH_ID = EXERCISE_IDS.PUSH
const REPS = EXERCISE_UNITS.REPS

describe("runPRDetection", () => {
  test("returns null when rounds is empty, no existing PRs", () => {
    expect(runPRDetection(PUSH_ID, [], [], REPS)).toBeNull()
  })

  test("returns null when rounds is empty even with existing PRs", () => {
    const existing: PRRecord[] = [{ date: "2024-01-01", value: 10, unit: REPS }]
    expect(runPRDetection(PUSH_ID, [], existing, REPS)).toBeNull()
  })

  test("returns new PRRecord when rounds has values and no existing PRs", () => {
    const result = runPRDetection(PUSH_ID, [8], [], REPS)
    expect(result).not.toBeNull()
    expect(result?.value).toBe(8)
    expect(result?.unit).toBe(REPS)
    expect(result?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test("returns new PRRecord when best round value exceeds current PR", () => {
    const existing: PRRecord[] = [{ date: "2024-01-01", value: 10, unit: REPS }]
    const result = runPRDetection(PUSH_ID, [15], existing, REPS)
    expect(result).not.toBeNull()
    expect(result?.value).toBe(15)
  })

  test("returns null when best round value equals current PR (no improvement)", () => {
    const existing: PRRecord[] = [{ date: "2024-01-01", value: 10, unit: REPS }]
    expect(runPRDetection(PUSH_ID, [10], existing, REPS)).toBeNull()
  })

  test("returns null when best round value is less than current PR", () => {
    const existing: PRRecord[] = [{ date: "2024-01-01", value: 10, unit: REPS }]
    expect(runPRDetection(PUSH_ID, [7], existing, REPS)).toBeNull()
  })

  test("uses max value from multi-round session", () => {
    const result = runPRDetection(PUSH_ID, [5, 12, 9, 11], [], REPS)
    expect(result?.value).toBe(12)
  })

  test("returns null when all rounds are 0 (invalid workout)", () => {
    expect(runPRDetection(PUSH_ID, [0, 0, 0], [], REPS)).toBeNull()
  })

  test("handles multiple existing PRs — compares against the highest", () => {
    const existing: PRRecord[] = [
      { date: "2024-01-01", value: 8, unit: REPS },
      { date: "2024-02-01", value: 12, unit: REPS },
      { date: "2024-03-01", value: 10, unit: REPS },
    ]
    // 13 > 12 (the current best) → should return new PR
    const result = runPRDetection(PUSH_ID, [13], existing, REPS)
    expect(result?.value).toBe(13)
  })

  test("returns null when new value beats some but not all PRs", () => {
    const existing: PRRecord[] = [
      { date: "2024-01-01", value: 8, unit: REPS },
      { date: "2024-02-01", value: 15, unit: REPS },
    ]
    // 11 > 8 but 11 < 15 — not a new overall best
    expect(runPRDetection(PUSH_ID, [11], existing, REPS)).toBeNull()
  })

  test("works for secs unit (plank)", () => {
    const SECS = EXERCISE_UNITS.SECS
    const result = runPRDetection(EXERCISE_IDS.PLANK, [65], [], SECS)
    expect(result?.unit).toBe(SECS)
    expect(result?.value).toBe(65)
  })
})
