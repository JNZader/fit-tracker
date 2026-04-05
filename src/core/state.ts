import type { AppData, ExerciseId, Phase, PRRecord, SessionRecord, Snapshot, TabId } from "@core/types"
import { loadData, loadStore, saveData } from "@core/storage"
import type { VersionedStore } from "@core/types"

// --- Event map ---

export type AppEvents = {
  "session:saved": { date: string; session: SessionRecord }
  "session:deleted": { date: string }
  "pr:updated": { exerciseId: ExerciseId; record: PRRecord }
  "phase:changed": { from: Phase; to: Phase; manual: boolean }
  "phase:advancement-detected": { currentPhase: Phase; nextPhase: Phase }
  "snapshot:created": { snapshot: Snapshot }
  "snapshot:restored": { snapshot: Snapshot }
  "tab:changed": { tab: TabId }
  "timer:started": { exerciseId: ExerciseId; durationSecs: number }
  "timer:completed": { exerciseId: ExerciseId }
  "timer:cancelled": Record<string, never>
  "import:completed": { sessionCount: number }
  "export:completed": Record<string, never>
}

// --- TypedEventEmitter ---

type Handler<T> = (payload: T) => void

export class TypedEventEmitter<T extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof T, Set<Handler<unknown>>>()

  on<K extends keyof T>(event: K, handler: Handler<T[K]>): void {
    const existing = this.listeners.get(event)
    if (existing) {
      existing.add(handler as Handler<unknown>)
    } else {
      this.listeners.set(event, new Set([handler as Handler<unknown>]))
    }
  }

  off<K extends keyof T>(event: K, handler: Handler<T[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<unknown>)
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    for (const handler of handlers) {
      handler(payload)
    }
  }
}

// --- AppState singleton ---

export class AppState extends TypedEventEmitter<AppEvents> {
  private static instance: AppState | undefined
  private data: AppData
  private store: VersionedStore

  private constructor() {
    super()
    this.store = loadStore()
    this.data = loadData()
  }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  getData(): Readonly<AppData> {
    return this.data
  }

  getStore(): Readonly<VersionedStore> {
    return this.store
  }

  /**
   * Mutate app data and persist automatically.
   * The updater receives a mutable draft — assign to fields directly.
   */
  mutate(updater: (draft: AppData) => void): void {
    // Shallow-clone to avoid direct mutation of the frozen reference
    const draft: AppData = {
      ...this.data,
      sessions: { ...this.data.sessions },
      prs: { ...this.data.prs },
    }

    updater(draft)

    this.data = draft
    saveData(draft)

    // Refresh the store reference so getStore() stays up to date
    this.store = loadStore()
  }

  /**
   * Reload in-memory state from localStorage.
   * Call after rollback or import to sync the singleton.
   */
  reload(): void {
    this.store = loadStore()
    this.data = loadData()
  }
}
