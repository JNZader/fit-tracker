import { describe, expect, test } from "bun:test"
import type { Snapshot } from "@core/types"
import { PHASES } from "@core/types"
import { emptyAppData, generateId, pruneSnapshots } from "./storage"

// ---------------------------------------------------------------------------
// pruneSnapshots
// ---------------------------------------------------------------------------

describe("pruneSnapshots", () => {
  function makeSnapshot(label: string): Snapshot {
    return {
      id: label,
      timestamp: new Date().toISOString(),
      label,
      source: "manual",
      data: emptyAppData(),
    }
  }

  test("returns same array when under max", () => {
    const snapshots = [makeSnapshot("a"), makeSnapshot("b")]
    const result = pruneSnapshots(snapshots, 5)
    expect(result).toHaveLength(2)
    expect(result).toBe(snapshots) // identity — same reference returned
  })

  test("returns same array when exactly at max (no removal)", () => {
    const snapshots = [makeSnapshot("a"), makeSnapshot("b"), makeSnapshot("c")]
    const result = pruneSnapshots(snapshots, 3)
    expect(result).toHaveLength(3)
  })

  test("removes oldest entries (from the front) when over max", () => {
    const snapshots = [
      makeSnapshot("oldest"),
      makeSnapshot("middle"),
      makeSnapshot("newest"),
    ]
    // max = 2 → should drop "oldest", keep "middle" and "newest"
    const result = pruneSnapshots(snapshots, 2)
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe("middle")
    expect(result[1]?.id).toBe("newest")
  })

  test("handles empty array", () => {
    const result = pruneSnapshots([], 5)
    expect(result).toHaveLength(0)
  })

  test("handles max = 1 (keeps only newest)", () => {
    const snapshots = [makeSnapshot("a"), makeSnapshot("b"), makeSnapshot("c")]
    const result = pruneSnapshots(snapshots, 1)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("c")
  })

  test("does not mutate the original array", () => {
    const snapshots = [
      makeSnapshot("a"),
      makeSnapshot("b"),
      makeSnapshot("c"),
    ]
    const original = [...snapshots]
    pruneSnapshots(snapshots, 2)
    expect(snapshots).toHaveLength(original.length)
  })
})

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe("generateId", () => {
  test("returns a 6-char string", () => {
    const id = generateId()
    expect(typeof id).toBe("string")
    expect(id).toHaveLength(6)
  })

  test("returns different values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()))
    // With 20 calls, we expect at least several unique values
    expect(ids.size).toBeGreaterThan(1)
  })

  test("contains only hex characters (base-16 output)", () => {
    for (let i = 0; i < 10; i++) {
      const id = generateId()
      expect(id).toMatch(/^[0-9a-f]+$/)
    }
  })
})

// ---------------------------------------------------------------------------
// emptyAppData
// ---------------------------------------------------------------------------

describe("emptyAppData", () => {
  test("returns schemaVersion 1", () => {
    expect(emptyAppData().schemaVersion).toBe(1)
  })

  test("returns currentPhase 1", () => {
    expect(emptyAppData().currentPhase).toBe(PHASES.ONE)
  })

  test("returns empty sessions object", () => {
    const data = emptyAppData()
    expect(data.sessions).toEqual({})
  })

  test("returns empty prs object", () => {
    const data = emptyAppData()
    expect(data.prs).toEqual({})
  })

  test("each call returns a new object (no shared reference)", () => {
    const a = emptyAppData()
    const b = emptyAppData()
    expect(a).not.toBe(b)
    a.sessions["test"] = { date: "2024-01-01", exercises: {} }
    expect(b.sessions["test"]).toBeUndefined()
  })
})
