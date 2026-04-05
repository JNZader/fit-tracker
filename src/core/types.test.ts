import { describe, expect, test } from "bun:test"
import { AppDataSchema } from "./types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validAppData() {
  return {
    schemaVersion: 1,
    currentPhase: 1,
    sessions: {},
    prs: {},
  }
}

// ---------------------------------------------------------------------------
// AppDataSchema validation
// ---------------------------------------------------------------------------

describe("AppDataSchema", () => {
  // --- Happy path ---

  test("valid AppData with empty sessions and prs passes", () => {
    const result = AppDataSchema.safeParse(validAppData())
    expect(result.success).toBe(true)
  })

  test("valid AppData with sessions passes", () => {
    const data = {
      ...validAppData(),
      sessions: {
        "sess-1": {
          date: "2024-03-15",
          exercises: { push: [10, 12, 11] },
          rpe: 7,
          feeling: 4,
          pain: "No",
          notes: "Felt good",
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  test("valid AppData with PR records passes", () => {
    const data = {
      ...validAppData(),
      prs: {
        push: [
          { date: "2024-01-10", value: 15, unit: "reps" },
          { date: "2024-02-01", value: 18, unit: "reps" },
        ],
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  test("all valid phase values (1-4) pass", () => {
    for (const phase of [1, 2, 3, 4]) {
      const result = AppDataSchema.safeParse({ ...validAppData(), currentPhase: phase })
      expect(result.success).toBe(true)
    }
  })

  // --- Missing required fields ---

  test("missing schemaVersion fails", () => {
    const { schemaVersion: _omit, ...data } = validAppData()
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("missing currentPhase fails", () => {
    const { currentPhase: _omit, ...data } = validAppData()
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("missing sessions fails", () => {
    const { sessions: _omit, ...data } = validAppData()
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("missing prs fails", () => {
    const { prs: _omit, ...data } = validAppData()
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  // --- Invalid phase ---

  test("invalid phase value 5 fails", () => {
    const result = AppDataSchema.safeParse({ ...validAppData(), currentPhase: 5 })
    expect(result.success).toBe(false)
  })

  test("invalid phase value 0 fails", () => {
    const result = AppDataSchema.safeParse({ ...validAppData(), currentPhase: 0 })
    expect(result.success).toBe(false)
  })

  test("phase as string fails", () => {
    const result = AppDataSchema.safeParse({ ...validAppData(), currentPhase: "1" })
    expect(result.success).toBe(false)
  })

  // --- Invalid RPE ---

  test("invalid RPE value 11 in session fails", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: {
          date: "2024-01-01",
          exercises: {},
          rpe: 11, // max is 10
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("invalid RPE value 0 in session fails", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: {
          date: "2024-01-01",
          exercises: {},
          rpe: 0, // min is 1
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("valid RPE value 10 passes", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: { date: "2024-01-01", exercises: {}, rpe: 10 },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  test("valid RPE value 1 passes", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: { date: "2024-01-01", exercises: {}, rpe: 1 },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  // --- Invalid feeling ---

  test("invalid feeling value 6 fails", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: {
          date: "2024-01-01",
          exercises: {},
          feeling: 6, // valid: 1-5
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("invalid feeling value 0 fails", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: {
          date: "2024-01-01",
          exercises: {},
          feeling: 0,
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  // --- Invalid pain ---

  test("invalid pain value fails", () => {
    const data = {
      ...validAppData(),
      sessions: {
        s1: {
          date: "2024-01-01",
          exercises: {},
          pain: "Espalda", // not in enum
        },
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("valid pain values pass", () => {
    const validPains = ["No", "Rodilla", "Hombro", "Lumbar", "Muñeca", "Otro"]
    for (const pain of validPains) {
      const data = {
        ...validAppData(),
        sessions: {
          s1: { date: "2024-01-01", exercises: {}, pain },
        },
      }
      expect(AppDataSchema.safeParse(data).success).toBe(true)
    }
  })

  // --- Nested PRRecord with wrong unit ---

  test("PRRecord with wrong unit value fails", () => {
    const data = {
      ...validAppData(),
      prs: {
        push: [
          { date: "2024-01-01", value: 15, unit: "minutes" }, // invalid unit
        ],
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(false)
  })

  test("PRRecord with valid unit 'reps' passes", () => {
    const data = {
      ...validAppData(),
      prs: {
        push: [{ date: "2024-01-01", value: 15, unit: "reps" }],
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  test("PRRecord with valid unit 'secs' passes", () => {
    const data = {
      ...validAppData(),
      prs: {
        plank: [{ date: "2024-01-01", value: 60, unit: "secs" }],
      },
    }
    expect(AppDataSchema.safeParse(data).success).toBe(true)
  })

  // --- Empty collections ---

  test("empty sessions object passes", () => {
    expect(AppDataSchema.safeParse({ ...validAppData(), sessions: {} }).success).toBe(true)
  })

  test("empty prs object passes", () => {
    expect(AppDataSchema.safeParse({ ...validAppData(), prs: {} }).success).toBe(true)
  })
})
