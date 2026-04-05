import type { AppData, Snapshot } from "@core/types"
import { AppDataSchema } from "@core/types"
import { AppState } from "@core/state"
import {
  createAndPrependSnapshot,
  loadData,
  loadStore,
  rollback,
  saveData,
} from "@core/storage"

// --- Export ---

/**
 * Creates a JSON blob from current AppData and triggers a browser download.
 * Filename format: workout-backup-YYYY-MM-DD.json
 */
export function exportData(): void {
  const data = loadData()
  const date = new Date().toISOString().slice(0, 10)
  const filename = `workout-backup-${date}.json`

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"

  document.body.appendChild(anchor)
  anchor.click()

  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)

  AppState.getInstance().emit("export:completed", {})
}

// --- Import ---

/**
 * Reads a JSON file, validates against AppDataSchema, creates a pre-import
 * snapshot and saves new data if valid.
 */
export async function importData(
  file: File
): Promise<{ ok: boolean; error?: string }> {
  let text: string

  try {
    text = await file.text()
  } catch {
    return { ok: false, error: "No se pudo leer el archivo." }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: "El archivo no es JSON válido." }
  }

  const result = AppDataSchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.errors[0]
    const msg = first ? `${first.path.join(".")} — ${first.message}` : "formato inválido"
    return { ok: false, error: `Schema inválido: ${msg}` }
  }

  const newData = result.data as AppData

  // Create pre-import snapshot of current state
  const currentData = loadData()
  const date = new Date().toISOString().slice(0, 10)
  createAndPrependSnapshot(currentData, `Antes de importar ${date}`, "import")

  // Save new data and reload state
  saveData(newData)
  AppState.getInstance().reload()

  const sessionCount = Object.keys(newData.sessions).length
  AppState.getInstance().emit("import:completed", { sessionCount })

  return { ok: true }
}

// --- Snapshot UI ---

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

const SOURCE_LABELS: Record<Snapshot["source"], string> = {
  import: "Importación",
  "phase-change": "Cambio de fase",
  manual: "Manual",
}

function renderSnapshotList(snapshots: Snapshot[], headId: string): string {
  if (snapshots.length === 0) {
    return `<p class="export-empty">Sin puntos de restauración.</p>`
  }

  // Display newest first
  const sorted = [...snapshots].reverse()
  const total = snapshots.length

  const items = sorted
    .map((snap) => {
      const isCurrent = snap.id === headId
      return `<li class="snapshot-item${isCurrent ? " current" : ""}" data-id="${snap.id}">
        <div class="snapshot-info">
          <span class="snapshot-label">${snap.label}</span>
          <span class="snapshot-meta">
            <span class="source-badge source-badge--${snap.source}">${SOURCE_LABELS[snap.source]}</span>
            <span class="snapshot-time">${formatTimestamp(snap.timestamp)}</span>
          </span>
        </div>
        ${
          isCurrent
            ? `<span class="snapshot-current-badge">Actual</span>`
            : `<button class="btn-restore" data-id="${snap.id}">Restaurar</button>`
        }
      </li>`
    })
    .join("")

  return `
    <p class="snapshot-count">${total} de 20 snapshots</p>
    <ul class="snapshot-list">${items}</ul>
  `
}

export function init(container: HTMLElement): void {
  // Hidden file input for import
  const fileInput = document.createElement("input")
  fileInput.type = "file"
  fileInput.accept = ".json,application/json"
  fileInput.style.display = "none"
  document.body.appendChild(fileInput)

  function render(): void {
    const store = AppState.getInstance().getStore()

    container.innerHTML = `
      <div class="export-section">
        <h2 class="export-title">Exportar / Importar</h2>

        <div class="export-actions">
          <button class="btn btn-export" id="btn-export">
            ↓ Exportar backup
          </button>
          <button class="btn btn-import-trigger" id="btn-import-trigger">
            ↑ Importar backup
          </button>
          <button class="btn btn-snapshot" id="btn-snapshot">
            + Crear punto de restauración
          </button>
        </div>

        <div id="import-status" class="import-status" aria-live="polite"></div>

        <div class="snapshot-section">
          <h3 class="snapshot-heading">Puntos de restauración</h3>
          <div id="snapshot-container">
            ${renderSnapshotList(store.snapshots, store.head)}
          </div>
        </div>
      </div>
    `

    // --- Export ---
    const btnExport = container.querySelector<HTMLButtonElement>("#btn-export")
    btnExport?.addEventListener("click", () => {
      exportData()
    })

    // --- Import trigger ---
    const btnImportTrigger = container.querySelector<HTMLButtonElement>("#btn-import-trigger")
    btnImportTrigger?.addEventListener("click", () => {
      fileInput.click()
    })

    // --- Create manual snapshot ---
    const btnSnapshot = container.querySelector<HTMLButtonElement>("#btn-snapshot")
    btnSnapshot?.addEventListener("click", () => {
      const label = window.prompt("Nombre del punto de restauración:", `Manual ${new Date().toISOString().slice(0, 10)}`)
      if (label === null) return // cancelled

      const currentData = loadData()
      const snapshot = createAndPrependSnapshot(currentData, label || "Manual", "manual")
      AppState.getInstance().reload()
      AppState.getInstance().emit("snapshot:created", { snapshot })
      render()
    })

    // --- Restore buttons ---
    container.querySelectorAll<HTMLButtonElement>(".btn-restore").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset["id"]
        if (!id) return

        const confirmed = window.confirm("¿Restaurar este punto? El estado actual se guardará como snapshot previo.")
        if (!confirmed) return

        try {
          rollback(id)
          AppState.getInstance().reload()

          const restoredStore = loadStore()
          const restored = restoredStore.snapshots.find((s) => s.id === id)
          if (restored) {
            AppState.getInstance().emit("snapshot:restored", { snapshot: restored })
          }

          render()
        } catch (err) {
          const statusEl = container.querySelector<HTMLElement>("#import-status")
          if (statusEl) {
            statusEl.textContent = err instanceof Error ? err.message : "Error al restaurar."
            statusEl.className = "import-status import-status--error"
          }
        }
      })
    })
  }

  // Initial render
  render()

  // File input change handler
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0]
    if (!file) return

    const statusEl = container.querySelector<HTMLElement>("#import-status")

    void importData(file).then((result) => {
      if (statusEl) {
        if (result.ok) {
          statusEl.textContent = "Importación exitosa."
          statusEl.className = "import-status import-status--ok"
        } else {
          statusEl.textContent = result.error ?? "Error desconocido."
          statusEl.className = "import-status import-status--error"
        }
      }

      if (result.ok) {
        render()
      }
    })

    // Reset input so same file can be re-selected
    fileInput.value = ""
  })

  // Re-render on import or snapshot events
  AppState.getInstance().on("import:completed", () => render())
  AppState.getInstance().on("snapshot:created", () => render())
  AppState.getInstance().on("snapshot:restored", () => render())
}
