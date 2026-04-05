import type { AppData, ExerciseId, Phase, Snapshot, VersionedStore } from "@core/types"
import { AppDataSchema } from "@core/types"

// --- Constants ---

export const CURRENT_SCHEMA_VERSION = 1
export const LEGACY_KEY = "mil-tracker-v3"
export const STORE_KEY = "workout-app-v1"
export const MAX_SNAPSHOTS = 21

// --- Pure helpers ---

export function generateId(): string {
  return Math.random().toString(16).slice(2, 8)
}

export function emptyAppData(): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentPhase: 1 as Phase,
    sessions: {},
    prs: {},
  }
}

export function pruneSnapshots(snapshots: Snapshot[], max: number): Snapshot[] {
  if (snapshots.length <= max) return snapshots
  // Remove oldest entries (from the front), preserve at most `max`
  return snapshots.slice(snapshots.length - max)
}

export function createSnapshot(
  data: AppData,
  label: string,
  source: Snapshot["source"]
): Snapshot {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    label,
    source,
    data,
  }
}

// --- Storage helpers (internal) ---

function saveStore(store: VersionedStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

// --- Migration ---

interface LegacyData {
  sessions?: unknown
  currentPhase?: unknown
  prs?: unknown
}

function isLegacyData(value: unknown): value is LegacyData {
  return typeof value === "object" && value !== null
}

export function migrateFromLegacy(): AppData | null {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isLegacyData(parsed)) return null

    // Attempt Zod validation directly (if shape matches)
    const result = AppDataSchema.safeParse(parsed)
    if (result.success) {
      return result.data as AppData
    }

    // Fallback: construct a minimal AppData from whatever we can salvage
    const empty = emptyAppData()

    // Try to recover sessions
    if (
      typeof parsed.sessions === "object" &&
      parsed.sessions !== null &&
      !Array.isArray(parsed.sessions)
    ) {
      empty.sessions = parsed.sessions as Record<string, { date: string; exercises: Partial<Record<ExerciseId, number[]>> }>
    }

    // Try to recover currentPhase
    if (
      typeof parsed.currentPhase === "number" &&
      [1, 2, 3, 4].includes(parsed.currentPhase)
    ) {
      empty.currentPhase = parsed.currentPhase as Phase
    }

    return empty
  } catch {
    return null
  }
}

// --- Public API ---

export function loadStore(): VersionedStore {
  const raw = localStorage.getItem(STORE_KEY)

  if (raw) {
    try {
      return JSON.parse(raw) as VersionedStore
    } catch {
      // Corrupted store — start fresh
    }
  }

  // First load: try to migrate from legacy
  const legacyData = migrateFromLegacy()
  const initialData = legacyData ?? emptyAppData()

  const label = legacyData
    ? "Migrado desde versión anterior"
    : "Estado inicial"

  const initialSnapshot = createSnapshot(initialData, label, "manual")
  const store: VersionedStore = {
    head: initialSnapshot.id,
    snapshots: [initialSnapshot],
  }

  saveStore(store)
  return store
}

export function loadData(): AppData {
  const store = loadStore()
  const head = store.snapshots.find((s) => s.id === store.head)

  if (!head) {
    // Head is missing — fallback to latest snapshot
    const latest = store.snapshots.at(-1)
    if (latest) return latest.data
    return emptyAppData()
  }

  return head.data
}

export function saveData(data: AppData): void {
  const store = loadStore()

  // Find and update the head snapshot's data in-place (no new snapshot)
  const headIndex = store.snapshots.findIndex((s) => s.id === store.head)

  if (headIndex !== -1) {
    // Update existing head snapshot data
    const existing = store.snapshots[headIndex]
    if (existing) {
      store.snapshots[headIndex] = { ...existing, data }
    }
  } else {
    // Head not found — create a new snapshot and make it head
    const snapshot = createSnapshot(data, "Guardado automático", "manual")
    store.snapshots.push(snapshot)
    store.head = snapshot.id
    store.snapshots = pruneSnapshots(store.snapshots, MAX_SNAPSHOTS)
  }

  saveStore(store)
}

export function createAndPrependSnapshot(
  data: AppData,
  label: string,
  source: Snapshot["source"]
): Snapshot {
  const store = loadStore()
  const snapshot = createSnapshot(data, label, source)

  // Prepend new snapshot (newest first conceptually, but we manage via head pointer)
  store.snapshots.push(snapshot)
  store.head = snapshot.id
  store.snapshots = pruneSnapshots(store.snapshots, MAX_SNAPSHOTS)

  saveStore(store)
  return snapshot
}

export function rollback(snapshotId: string): void {
  const store = loadStore()

  // 1. Auto-snapshot current state as "pre-rollback" FIRST
  const currentHeadSnapshot = store.snapshots.find((s) => s.id === store.head)
  const currentData = currentHeadSnapshot?.data ?? emptyAppData()

  const preRollbackSnapshot = createSnapshot(
    currentData,
    "Pre-rollback automático",
    "manual"
  )
  store.snapshots.push(preRollbackSnapshot)

  // 2. Verify target snapshot exists
  const target = store.snapshots.find((s) => s.id === snapshotId)
  if (!target) {
    // Undo pre-rollback snapshot and abort
    store.snapshots.pop()
    saveStore(store)
    throw new Error(`Snapshot "${snapshotId}" no encontrado`)
  }

  // 3. Set head to target
  store.head = snapshotId

  // Prune if needed
  store.snapshots = pruneSnapshots(store.snapshots, MAX_SNAPSHOTS)

  saveStore(store)
}
