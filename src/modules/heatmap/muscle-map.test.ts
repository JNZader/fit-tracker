import { describe, expect, it } from "bun:test"
import {
  EXERCISE_MUSCLE_MAP,
  MUSCLE_IDS,
  MUSCLES,
  type MuscleActivation,
  type MuscleId,
  getAllMuscleGroups,
  getExercisesForMuscle,
  getMusclesForExercise,
} from "./muscle-map"
import { EXERCISE_IDS, type ExerciseId } from "@core/types"

// ---------------------------------------------------------------------------
// MUSCLE_IDS
// ---------------------------------------------------------------------------
describe("MUSCLE_IDS", () => {
  it("has exactly 36 entries", () => {
    expect(Object.keys(MUSCLE_IDS).length).toBe(36)
  })
})

// ---------------------------------------------------------------------------
// MUSCLES registry
// ---------------------------------------------------------------------------
describe("MUSCLES", () => {
  it("has an entry for every MuscleId", () => {
    const ids = Object.values(MUSCLE_IDS) as MuscleId[]
    for (const id of ids) {
      expect(MUSCLES[id]).toBeDefined()
      expect(MUSCLES[id].id).toBe(id)
    }
  })

  it('every muscle has a valid group ("front" | "back")', () => {
    for (const info of Object.values(MUSCLES)) {
      expect(["front", "back"]).toContain(info.group)
    }
  })

  it("every muscle has a body region", () => {
    const validRegions = [
      "chest",
      "back",
      "arms",
      "legs",
      "core",
      "shoulders",
    ]
    for (const info of Object.values(MUSCLES)) {
      expect(validRegions).toContain(info.region)
    }
  })
})

// ---------------------------------------------------------------------------
// EXERCISE_MUSCLE_MAP
// ---------------------------------------------------------------------------
describe("EXERCISE_MUSCLE_MAP", () => {
  const exerciseIds = Object.values(EXERCISE_IDS) as ExerciseId[]

  it("covers all 6 ExerciseIds", () => {
    for (const id of exerciseIds) {
      expect(EXERCISE_MUSCLE_MAP[id]).toBeDefined()
      expect(EXERCISE_MUSCLE_MAP[id].length).toBeGreaterThan(0)
    }
  })

  it("each exercise has at least 1 primary muscle (weight 1.0)", () => {
    for (const id of exerciseIds) {
      const primaries = EXERCISE_MUSCLE_MAP[id].filter(
        (a) => a.role === "primary" && a.weight === 1.0,
      )
      expect(primaries.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("weights match roles: primary=1.0, secondary=0.5, stabilizer=0.25", () => {
    for (const id of exerciseIds) {
      for (const act of EXERCISE_MUSCLE_MAP[id]) {
        if (act.role === "primary") expect(act.weight).toBe(1.0)
        if (act.role === "secondary") expect(act.weight).toBe(0.5)
        if (act.role === "stabilizer") expect(act.weight).toBe(0.25)
      }
    }
  })

  it("only uses valid MuscleIds", () => {
    const validMuscleIds = new Set(Object.values(MUSCLE_IDS))
    for (const id of exerciseIds) {
      for (const act of EXERCISE_MUSCLE_MAP[id]) {
        expect(validMuscleIds.has(act.muscleId)).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getMusclesForExercise()
// ---------------------------------------------------------------------------
describe("getMusclesForExercise", () => {
  it("returns correct muscles for push-ups", () => {
    const muscles = getMusclesForExercise("push")
    const ids = muscles.map((m) => m.muscleId)
    expect(ids).toContain("pectorals")
    expect(ids).toContain("anterior-deltoid")
    expect(ids).toContain("triceps")
  })

  it("returns correct muscles for rows", () => {
    const muscles = getMusclesForExercise("row")
    const ids = muscles.map((m) => m.muscleId)
    expect(ids).toContain("lats")
    expect(ids).toContain("rhomboids")
    expect(ids).toContain("posterior-deltoid")
  })

  it("returns empty array for unknown exercise", () => {
    const muscles = getMusclesForExercise("unknown" as ExerciseId)
    expect(muscles).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getExercisesForMuscle()
// ---------------------------------------------------------------------------
describe("getExercisesForMuscle", () => {
  it("reverse lookup works for glutes", () => {
    const exercises = getExercisesForMuscle("glutes" as MuscleId)
    const ids = exercises.map((e) => e.exerciseId)
    // glutes is used in bridge, wall-sit, and bird-dog
    expect(ids).toContain("bridge")
    expect(ids).toContain("birddog")
  })

  it("returns empty array for unused muscle", () => {
    // Pick a muscle not used in any exercise
    const exercises = getExercisesForMuscle("nonexistent" as MuscleId)
    expect(exercises).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getAllMuscleGroups()
// ---------------------------------------------------------------------------
describe("getAllMuscleGroups", () => {
  it('returns both "front" and "back" groups', () => {
    const groups = getAllMuscleGroups()
    expect(Object.keys(groups)).toContain("front")
    expect(Object.keys(groups)).toContain("back")
  })

  it("front and back groups contain muscles", () => {
    const groups = getAllMuscleGroups()
    expect(groups.front.length).toBeGreaterThan(0)
    expect(groups.back.length).toBeGreaterThan(0)
  })

  it("total muscles across groups equals 36", () => {
    const groups = getAllMuscleGroups()
    const total = groups.front.length + groups.back.length
    expect(total).toBe(36)
  })
})
