// --- CSS imports ---
import "@styles/tokens.css"
import "@styles/base.css"
import "@modules/home/home.css"
import "@modules/timer/timer.css"
import "@modules/tracking/tracking.css"
import "@modules/pr-board/pr-board.css"
import "@modules/export/export.css"

// --- Core imports ---
import { HashRouter } from "@core/router"
import { AppState } from "@core/state"
import { migrateFromLegacy } from "@core/storage"
import type { Phase } from "@core/types"

// --- Module imports ---
import { init as initHome } from "@modules/home/home"
import { init as initRutina } from "@modules/rutina/rutina"
import { init as initEjercicios } from "@modules/ejercicios/ejercicios"
import { init as initSistema } from "@modules/sistema/sistema"
import { init as initTracking } from "@modules/tracking/tracking"
import { init as initPRBoard } from "@modules/pr-board/pr-board"
import { init as initExport } from "@modules/export/export"

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

export function showToast(
  message: string,
  type: "success" | "warning" | "info" = "info",
): void {
  const container = document.getElementById("toast-container")
  if (!container) return

  const toast = document.createElement("div")
  toast.className = `toast toast--${type === "success" ? "success" : type === "warning" ? "warning" : "info"}`
  toast.textContent = message

  container.appendChild(toast)

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.style.transition = "opacity 300ms ease"
    toast.style.opacity = "0"
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, 4000)
}

// ---------------------------------------------------------------------------
// Phase advancement modal
// ---------------------------------------------------------------------------

let pendingNextPhase: Phase | null = null

function showPhaseModal(currentPhase: Phase, nextPhase: Phase): void {
  const modal = document.getElementById("phase-modal")
  const body = document.getElementById("phase-modal-body")
  if (!modal || !body) return

  pendingNextPhase = nextPhase
  body.textContent = `¡Cumpliste todos los criterios para avanzar de Fase ${currentPhase} a Fase ${nextPhase}! ¿Querés confirmar el avance?`

  modal.classList.remove("hidden")
}

function hidePhaseModal(): void {
  const modal = document.getElementById("phase-modal")
  if (modal) modal.classList.add("hidden")
  pendingNextPhase = null
}

function wirePhaseModal(): void {
  const dismissBtn = document.getElementById("phase-modal-dismiss")
  const confirmBtn = document.getElementById("phase-modal-confirm")

  dismissBtn?.addEventListener("click", () => {
    hidePhaseModal()
  })

  confirmBtn?.addEventListener("click", () => {
    if (pendingNextPhase !== null) {
      const state = AppState.getInstance()
      const current = state.getData().currentPhase
      state.mutate((draft) => {
        draft.currentPhase = pendingNextPhase as Phase
      })
      state.emit("phase:changed", {
        from: current,
        to: pendingNextPhase as Phase,
        manual: false,
      })
    }
    hidePhaseModal()
  })

  // Close on overlay click
  document.getElementById("phase-modal")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "phase-modal") {
      hidePhaseModal()
    }
  })
}

// ---------------------------------------------------------------------------
// Nav tab click wiring
// ---------------------------------------------------------------------------

function wireNavTabs(): void {
  const router = HashRouter.getInstance()
  document.querySelectorAll<HTMLButtonElement>("[data-nav-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset["navTab"]
      if (tab) {
        router.navigateTo(tab as Parameters<typeof router.navigateTo>[0])
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function bootstrap(): void {
  // 1. Init router (reads current hash, activates correct tab)
  HashRouter.getInstance().init()

  // 2. Legacy migration check
  const legacyData = migrateFromLegacy()
  if (legacyData) {
    showToast("Datos migrados desde versión anterior correctamente.", "success")
  }

  // 3. Wire nav tabs
  wireNavTabs()

  // 4. Wire phase modal
  wirePhaseModal()

  // 5. Init modules into their containers
  const inicioRoot = document.getElementById("inicio-root")
  if (inicioRoot) initHome(inicioRoot)

  const rutinaRoot = document.getElementById("rutina-root")
  if (rutinaRoot) initRutina(rutinaRoot)

  const ejerciciosRoot = document.getElementById("ejercicios-root")
  if (ejerciciosRoot) initEjercicios(ejerciciosRoot)

  const sistemaRoot = document.getElementById("sistema-root")
  if (sistemaRoot) initSistema(sistemaRoot)

  const trackingRoot = document.getElementById("tracking-root")
  if (trackingRoot) initTracking(trackingRoot)

  // PR board and export panels (if present in DOM)
  const prBoardRoot = document.getElementById("pr-board-root")
  if (prBoardRoot) initPRBoard(prBoardRoot)

  const exportRoot = document.getElementById("export-root")
  if (exportRoot) initExport(exportRoot)

  // 6. Global event listeners

  // Phase advancement detected → show modal
  AppState.getInstance().on("phase:advancement-detected", ({ currentPhase, nextPhase }) => {
    showPhaseModal(currentPhase, nextPhase)
  })

  // Phase changed → toast
  AppState.getInstance().on("phase:changed", ({ to }) => {
    showToast(`¡Avanzaste a Fase ${to}!`, "success")
  })

  // Snapshot restored → toast
  AppState.getInstance().on("snapshot:restored", ({ snapshot }) => {
    const date = new Date(snapshot.timestamp).toLocaleDateString("es-AR")
    showToast(`Restaurado al snapshot del ${date}`, "info")
  })

  // Import completed → toast
  AppState.getInstance().on("import:completed", ({ sessionCount }) => {
    showToast(`Importado correctamente — ${sessionCount} sesiones`, "success")
  })

  // PR updated → toast
  AppState.getInstance().on("pr:updated", ({ exerciseId, record }) => {
    showToast(`¡Nuevo récord! ${exerciseId} — ${record.value} ${record.unit}`, "success")
  })
}

// Run on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap)
} else {
  bootstrap()
}
