import type { ExerciseId } from "@core/types"
import { AppState } from "@core/state"

// --- Constants ---

const TIMER_KEY_PREFIX = "timer-end-"

// --- Helpers ---

function storageKey(exerciseId: ExerciseId): string {
  return `${TIMER_KEY_PREFIX}${exerciseId}`
}

// --- IsometricTimer ---

export class IsometricTimer {
  private readonly exerciseId: ExerciseId
  private readonly durationSecs: number
  private readonly onTick: (remaining: number) => void
  private readonly onComplete: () => void

  private endTime: number = 0
  private rafId: number | null = null
  private audioCtx: AudioContext | null = null

  private static activeTimer: IsometricTimer | null = null

  constructor(
    exerciseId: ExerciseId,
    durationSecs: number,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ) {
    this.exerciseId = exerciseId
    this.durationSecs = durationSecs
    this.onTick = onTick
    this.onComplete = onComplete
  }

  // --- Web Audio API ---

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
    }
    return this.audioCtx
  }

  private beep(): void {
    try {
      const ctx = this.getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime)

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // Audio not available — silently skip
    }
  }

  // --- RAF loop ---

  private tick(): void {
    const now = performance.now()
    const remaining = Math.max(0, (this.endTime - Date.now()) / 1000)

    this.onTick(Math.ceil(remaining))

    if (remaining <= 0) {
      this.cleanup()
      this.beep()
      this.onComplete()
      AppState.getInstance().emit("timer:completed", { exerciseId: this.exerciseId })
      IsometricTimer.activeTimer = null
      return
    }

    this.rafId = requestAnimationFrame(() => this.tick())

    // Suppress unused variable warning — now is used above as a timing reference
    void now
  }

  // --- Page Visibility ---

  private readonly handleVisibility = (): void => {
    if (document.visibilityState === "visible" && this.rafId !== null) {
      // Recalculate remaining from stored endTime (handles tab sleep drift)
      const remaining = (this.endTime - Date.now()) / 1000
      if (remaining <= 0) {
        this.cleanup()
        this.beep()
        this.onComplete()
        AppState.getInstance().emit("timer:completed", { exerciseId: this.exerciseId })
        IsometricTimer.activeTimer = null
      }
      // RAF will resume naturally — no need to restart
    }
  }

  // --- Cleanup ---

  private cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    sessionStorage.removeItem(storageKey(this.exerciseId))
    document.removeEventListener("visibilitychange", this.handleVisibility)
  }

  // --- Public API ---

  start(): void {
    // Only one active timer at a time
    if (IsometricTimer.activeTimer && IsometricTimer.activeTimer !== this) {
      IsometricTimer.activeTimer.cancel()
    }

    // Lazy AudioContext init on first start (avoids browser autoplay policy)
    this.getAudioContext()

    this.endTime = Date.now() + this.durationSecs * 1000
    sessionStorage.setItem(storageKey(this.exerciseId), String(this.endTime))

    document.addEventListener("visibilitychange", this.handleVisibility)

    IsometricTimer.activeTimer = this

    AppState.getInstance().emit("timer:started", {
      exerciseId: this.exerciseId,
      durationSecs: this.durationSecs,
    })

    this.rafId = requestAnimationFrame(() => this.tick())
  }

  cancel(): void {
    this.cleanup()
    IsometricTimer.activeTimer = null
    AppState.getInstance().emit("timer:cancelled", {})
  }

  static recover(
    exerciseId: ExerciseId,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ): IsometricTimer | null {
    const raw = sessionStorage.getItem(storageKey(exerciseId))
    if (!raw) return null

    const endTime = Number(raw)
    if (isNaN(endTime)) return null

    const remaining = (endTime - Date.now()) / 1000
    if (remaining <= 0) {
      sessionStorage.removeItem(storageKey(exerciseId))
      return null
    }

    const timer = new IsometricTimer(exerciseId, remaining, onTick, onComplete)
    timer.endTime = endTime
    return timer
  }
}
