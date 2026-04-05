import { AppState } from "@core/state"
import { createAndPrependSnapshot, loadData, saveData } from "@core/storage"
import type { Phase } from "@core/types"
import { PHASE_CONFIGS, PHASE_LABELS } from "@modules/phase/phase"

// ---------------------------------------------------------------------------
// Phase exit criteria text (keyed by phase)
// ---------------------------------------------------------------------------

const PHASE_EXIT_CRITERIA_HTML: Record<number, string> = {
  1: `<ul style="margin:var(--sp3) 0 0 var(--sp4);color:var(--text)">
    <li>Push-ups: mínimo 12 reps en 2 semanas consecutivas</li>
    <li>Rows: mínimo 15 reps</li>
    <li>Plank: mínimo 40 segs</li>
    <li>Wall Sit: mínimo 40 segs</li>
    <li>Consistencia ≥ 80% (3 días/semana)</li>
  </ul>`,
  2: `<ul style="margin:var(--sp3) 0 0 var(--sp4);color:var(--text)">
    <li>Push-ups: mínimo 15 reps en 2 semanas consecutivas</li>
    <li>Rows: mínimo 18 reps</li>
    <li>Plank: mínimo 60 segs</li>
    <li>Wall Sit: mínimo 60 segs</li>
    <li>Consistencia ≥ 80% (3 días/semana)</li>
  </ul>`,
  3: `<ul style="margin:var(--sp3) 0 0 var(--sp4);color:var(--text)">
    <li>Push-ups: mínimo 20 reps en 4 semanas consecutivas</li>
    <li>Rows: mínimo 18 reps</li>
    <li>Plank: mínimo 75 segs</li>
    <li>Wall Sit: mínimo 75 segs</li>
    <li>Consistencia ≥ 80% (3 días/semana)</li>
  </ul>`,
  4: `<p style="color:var(--accent)">Fase élite alcanzada. Sin fase superior.</p>`,
}

// ---------------------------------------------------------------------------
// Static workout plan HTML
// ---------------------------------------------------------------------------

function renderPhaseCards(): string {
  return `
    <!-- FASE 1 -->
    <div class="cd mb-4">
      <div class="cd__header">
        <span class="ph ph--1">Fase 1 — Base</span>
        <span style="color:var(--text-dim);font-size:0.8rem">4 semanas · 3×/semana</span>
      </div>

      <h3>Calentamiento (5 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Reps/Duración</th><th>Nota</th>
        </tr></thead>
        <tbody>
          <tr><td>Círculos de muñecas</td><td>10 × sentido</td><td></td></tr>
          <tr><td>Círculos de hombros</td><td>10 × dirección</td><td></td></tr>
          <tr><td>Rotaciones de cadera</td><td>10 × lado</td><td></td></tr>
          <tr><td>Cat-Cow</td><td>10 reps</td><td>Respiración controlada</td></tr>
          <tr><td>Marcha en el lugar</td><td>60 segs</td><td>Rodillas al pecho</td></tr>
          <tr><td>Glute bridges suaves</td><td>10 reps</td><td>Sin carga</td></tr>
        </tbody>
      </table>

      <h3>Circuito principal</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Cat</th><th>Series×Reps</th><th>Notas</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Push-ups</td>
            <td><span class="ph ph--1">push</span></td>
            <td>3 × 8–12</td>
            <td>Manos ancho hombros, core activo</td>
          </tr>
          <tr>
            <td>Remo con toalla/puerta</td>
            <td><span class="ph ph--2">pull</span></td>
            <td>3 × 10–15</td>
            <td>Cuerpo recto, escápulas retraídas</td>
          </tr>
          <tr>
            <td>Glute Bridge</td>
            <td><span class="ph ph--1">lower</span></td>
            <td>3 × 15–20</td>
            <td>Empuje de talones, glúteo arriba</td>
          </tr>
          <tr>
            <td>Wall Sit</td>
            <td><span class="ph ph--3">lower</span></td>
            <td>3 × 30–40 s</td>
            <td>90° en rodillas, espalda plana</td>
          </tr>
          <tr>
            <td>Plank de antebrazos</td>
            <td><span class="ph ph--4">core</span></td>
            <td>3 × 20–40 s</td>
            <td>Cadera alineada, respiración constante</td>
          </tr>
          <tr>
            <td>Bird-Dog</td>
            <td><span class="ph ph--4">core</span></td>
            <td>3 × 10 × lado</td>
            <td>Movimiento lento y controlado</td>
          </tr>
        </tbody>
      </table>

      <h3>Enfriamiento (5 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr><th>Ejercicio</th><th>Duración</th></tr></thead>
        <tbody>
          <tr><td>Estiramiento pectoral en puerta</td><td>30 s × lado</td></tr>
          <tr><td>Flexor de cadera en rodilla</td><td>30 s × lado</td></tr>
          <tr><td>Isquiotibiales sentado</td><td>30 s × lado</td></tr>
          <tr><td>Cuádriceps de pie</td><td>30 s × lado</td></tr>
          <tr><td>Respiración diafragmática</td><td>2 min</td></tr>
        </tbody>
      </table>

      <div class="cd cd--green" style="margin-top:var(--sp3)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Criterios de salida — Fase 1</div>
        ${PHASE_EXIT_CRITERIA_HTML[1] ?? ""}
      </div>
    </div>

    <!-- FASE 2 -->
    <div class="cd mb-4">
      <div class="cd__header">
        <span class="ph ph--2">Fase 2 — Desarrollo</span>
        <span style="color:var(--text-dim);font-size:0.8rem">4 semanas · 3×/semana</span>
      </div>

      <h3>Calentamiento (5 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Reps/Duración</th><th>Nota</th>
        </tr></thead>
        <tbody>
          <tr><td>Círculos de muñecas</td><td>10 × sentido</td><td></td></tr>
          <tr><td>Círculos de hombros</td><td>10 × dirección</td><td></td></tr>
          <tr><td>Rotaciones de cadera</td><td>10 × lado</td><td></td></tr>
          <tr><td>Cat-Cow</td><td>10 reps</td><td>Respiración controlada</td></tr>
          <tr><td>Marcha en el lugar</td><td>60 segs</td><td></td></tr>
          <tr><td>Glute bridges suaves</td><td>15 reps</td><td></td></tr>
        </tbody>
      </table>

      <h3>Circuito principal (4 series)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Cat</th><th>Series×Reps</th><th>Notas</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Push-ups</td>
            <td><span class="ph ph--1">push</span></td>
            <td>4 × 10–15</td>
            <td>Aumentá 1 rep/semana si podés</td>
          </tr>
          <tr>
            <td>Remo con toalla/puerta</td>
            <td><span class="ph ph--2">pull</span></td>
            <td>4 × 12–18</td>
            <td>Ratio push:pull 1:1.5</td>
          </tr>
          <tr>
            <td>Glute Bridge con pausa</td>
            <td><span class="ph ph--1">lower</span></td>
            <td>4 × 15–20</td>
            <td>3 s arriba</td>
          </tr>
          <tr>
            <td>Wall Sit</td>
            <td><span class="ph ph--3">lower</span></td>
            <td>4 × 40–60 s</td>
            <td></td>
          </tr>
          <tr>
            <td>Plank de antebrazos</td>
            <td><span class="ph ph--4">core</span></td>
            <td>4 × 40–60 s</td>
            <td></td>
          </tr>
          <tr>
            <td>Dead Bug</td>
            <td><span class="ph ph--4">core</span></td>
            <td>4 × 8 × lado</td>
            <td>Espalda baja pegada al piso</td>
          </tr>
        </tbody>
      </table>

      <h3>Enfriamiento (5 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr><th>Ejercicio</th><th>Duración</th></tr></thead>
        <tbody>
          <tr><td>Estiramiento pectoral</td><td>30 s × lado</td></tr>
          <tr><td>Flexor de cadera</td><td>30 s × lado</td></tr>
          <tr><td>Isquiotibiales</td><td>30 s × lado</td></tr>
          <tr><td>Cuádriceps</td><td>30 s × lado</td></tr>
          <tr><td>Respiración diafragmática</td><td>2 min</td></tr>
        </tbody>
      </table>

      <div class="cd cd--blue" style="margin-top:var(--sp3)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Criterios de salida — Fase 2</div>
        ${PHASE_EXIT_CRITERIA_HTML[2] ?? ""}
      </div>
    </div>

    <!-- FASE 3 -->
    <div class="cd mb-4">
      <div class="cd__header">
        <span class="ph ph--3">Fase 3 — Fuerza</span>
        <span style="color:var(--text-dim);font-size:0.8rem">4 semanas · 3×/semana</span>
      </div>

      <h3>Calentamiento (7 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Reps/Duración</th><th>Nota</th>
        </tr></thead>
        <tbody>
          <tr><td>Círculos de muñecas</td><td>15 × sentido</td><td></td></tr>
          <tr><td>Círculos de hombros</td><td>15 × dirección</td><td></td></tr>
          <tr><td>Rotaciones de cadera</td><td>15 × lado</td><td></td></tr>
          <tr><td>Cat-Cow</td><td>12 reps</td><td></td></tr>
          <tr><td>Marcha en el lugar</td><td>90 segs</td><td>Elevación de rodillas</td></tr>
          <tr><td>Glute bridges activos</td><td>15 reps</td><td>Con pausa 2 s</td></tr>
        </tbody>
      </table>

      <h3>Circuito principal (4 series)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Cat</th><th>Series×Reps</th><th>Notas</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Push-ups progresivos</td>
            <td><span class="ph ph--1">push</span></td>
            <td>4 × 15–20</td>
            <td>Elevar pies si es fácil</td>
          </tr>
          <tr>
            <td>Remo elevado con toalla</td>
            <td><span class="ph ph--2">pull</span></td>
            <td>4 × 15–18</td>
            <td>Ángulo más horizontal = más difícil</td>
          </tr>
          <tr>
            <td>Glute Bridge unilateral</td>
            <td><span class="ph ph--1">lower</span></td>
            <td>4 × 12 × lado</td>
            <td></td>
          </tr>
          <tr>
            <td>Wall Sit con pausa</td>
            <td><span class="ph ph--3">lower</span></td>
            <td>4 × 60–75 s</td>
            <td></td>
          </tr>
          <tr>
            <td>Plank con elevación de brazo</td>
            <td><span class="ph ph--4">core</span></td>
            <td>4 × 60–75 s</td>
            <td>Alternando lados</td>
          </tr>
          <tr>
            <td>Hollow Hold</td>
            <td><span class="ph ph--4">core</span></td>
            <td>4 × 20–30 s</td>
            <td>Zona lumbar pegada al suelo</td>
          </tr>
        </tbody>
      </table>

      <h3>Enfriamiento (5 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr><th>Ejercicio</th><th>Duración</th></tr></thead>
        <tbody>
          <tr><td>Estiramiento pectoral</td><td>45 s × lado</td></tr>
          <tr><td>Flexor de cadera</td><td>45 s × lado</td></tr>
          <tr><td>Isquiotibiales</td><td>45 s × lado</td></tr>
          <tr><td>Cuádriceps</td><td>45 s × lado</td></tr>
          <tr><td>Respiración diafragmática</td><td>2 min</td></tr>
        </tbody>
      </table>

      <div class="cd" style="border-color:var(--orange);background:var(--orange-bg);margin-top:var(--sp3)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Criterios de salida — Fase 3</div>
        ${PHASE_EXIT_CRITERIA_HTML[3] ?? ""}
      </div>
    </div>

    <!-- FASE 4 -->
    <div class="cd mb-4">
      <div class="cd__header">
        <span class="ph ph--4">Fase 4 — Élite</span>
        <span style="color:var(--text-dim);font-size:0.8rem">Continuo · 3–4×/semana</span>
      </div>

      <h3>Calentamiento (8 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Reps/Duración</th><th>Nota</th>
        </tr></thead>
        <tbody>
          <tr><td>Círculos de muñecas</td><td>15 × sentido</td><td></td></tr>
          <tr><td>Círculos de hombros</td><td>15 × dirección</td><td></td></tr>
          <tr><td>Rotaciones de cadera</td><td>15 × lado</td><td></td></tr>
          <tr><td>Cat-Cow dinámico</td><td>15 reps</td><td></td></tr>
          <tr><td>Marcha elevada</td><td>2 min</td><td>Rodillas arriba al máximo</td></tr>
          <tr><td>Glute bridges explosivos</td><td>20 reps</td><td>Veloz al subir, lento al bajar</td></tr>
        </tbody>
      </table>

      <h3>Circuito principal (5 series)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr>
          <th>Ejercicio</th><th>Cat</th><th>Series×Reps</th><th>Notas</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Push-ups pies elevados</td>
            <td><span class="ph ph--1">push</span></td>
            <td>5 × 15–20</td>
            <td>Pies en silla/cama</td>
          </tr>
          <tr>
            <td>Remo horizontal</td>
            <td><span class="ph ph--2">pull</span></td>
            <td>5 × 15–20</td>
            <td>Cuerpo casi horizontal</td>
          </tr>
          <tr>
            <td>Pistol Squat asistido</td>
            <td><span class="ph ph--1">lower</span></td>
            <td>5 × 8 × lado</td>
            <td>Con apoyo de pared</td>
          </tr>
          <tr>
            <td>Wall Sit máximo</td>
            <td><span class="ph ph--3">lower</span></td>
            <td>5 × máx</td>
            <td>Superar marca anterior</td>
          </tr>
          <tr>
            <td>Plank con movimiento</td>
            <td><span class="ph ph--4">core</span></td>
            <td>5 × 75+ s</td>
            <td>Tocar hombro alterno</td>
          </tr>
          <tr>
            <td>Superman</td>
            <td><span class="ph ph--4">core</span></td>
            <td>5 × 12</td>
            <td>2 s arriba, 2 s abajo</td>
          </tr>
        </tbody>
      </table>

      <h3>Enfriamiento (8 min)</h3>
      <table class="tb" style="margin-bottom:var(--sp4)">
        <thead><tr><th>Ejercicio</th><th>Duración</th></tr></thead>
        <tbody>
          <tr><td>Estiramiento pectoral profundo</td><td>60 s × lado</td></tr>
          <tr><td>Flexor de cadera con rotación</td><td>60 s × lado</td></tr>
          <tr><td>Isquiotibiales activos</td><td>60 s × lado</td></tr>
          <tr><td>Cuádriceps con estabilidad</td><td>60 s × lado</td></tr>
          <tr><td>Respiración diafragmática profunda</td><td>3 min</td></tr>
        </tbody>
      </table>

      <div class="cd cd--accent" style="margin-top:var(--sp3)">
        <div class="cd__title" style="margin-bottom:var(--sp2)">Fase Élite — Sin criterios de salida</div>
        <p style="color:var(--text)">Has alcanzado el nivel máximo del programa. El objetivo ahora es mantener y superar tus marcas personales.</p>
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Phase advancement section (reactive)
// ---------------------------------------------------------------------------

function renderAdvancementSection(currentPhase: Phase): string {
  const phaseConfig = PHASE_CONFIGS.find((c) => c.phase === currentPhase)
  const phaseLabel = PHASE_LABELS[currentPhase]
  const nextPhase = currentPhase < 4 ? currentPhase + 1 : null

  const exitCriteriaHtml = PHASE_EXIT_CRITERIA_HTML[currentPhase] ?? "<p>Sin criterios de salida.</p>"

  const advanceBtn = nextPhase
    ? `<button id="btn-advance-phase" class="btn btn--primary btn--lg" style="margin-top:var(--sp4)">
        Avanzar a Fase ${nextPhase} manualmente
      </button>`
    : `<p style="color:var(--accent);margin-top:var(--sp4)">Ya estás en la fase máxima.</p>`

  void phaseConfig // used implicitly via exitCriteriaHtml

  return `
    <div id="phase-advancement-section" class="cd cd--accent" style="margin-top:var(--sp5)">
      <h2>Avance de Fase</h2>
      <p>Fase actual: <strong style="color:var(--accent)">${phaseLabel}</strong></p>
      <div style="margin-top:var(--sp3)">
        <div style="color:var(--text-dim);font-family:var(--font-display);font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:var(--sp2)">
          Criterios de salida
        </div>
        ${exitCriteriaHtml}
      </div>
      ${advanceBtn}
      <p style="margin-top:var(--sp3);color:var(--green);font-size:0.85rem">
        ✓ Detección automática activa
      </p>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Phase advancement logic
// ---------------------------------------------------------------------------

function advancePhaseManually(container: HTMLElement): void {
  const data = loadData()
  const currentPhase = data.currentPhase

  if (currentPhase >= 4) return

  const nextPhase = (currentPhase + 1) as Phase

  // Create snapshot before changing phase
  createAndPrependSnapshot(data, `Antes de avanzar a Fase ${nextPhase}`, "phase-change")

  // Save with new phase
  const updatedData = { ...data, currentPhase: nextPhase }
  saveData(updatedData)
  AppState.getInstance().reload()

  AppState.getInstance().emit("phase:changed", {
    from: currentPhase,
    to: nextPhase,
    manual: true,
  })

  // Re-render advancement section
  rerenderAdvancement(container)
}

function rerenderAdvancement(container: HTMLElement): void {
  const section = container.querySelector<HTMLElement>("#phase-advancement-section")
  if (!section) return

  const data = loadData()
  const wrapper = document.createElement("div")
  wrapper.innerHTML = renderAdvancementSection(data.currentPhase)
  const newSection = wrapper.firstElementChild
  if (newSection) {
    section.replaceWith(newSection)
    wireAdvancementButton(container)
  }
}

function wireAdvancementButton(container: HTMLElement): void {
  const btn = container.querySelector<HTMLButtonElement>("#btn-advance-phase")
  if (!btn) return
  btn.addEventListener("click", () => {
    if (confirm("¿Avanzar de fase manualmente? Se creará un snapshot del estado actual.")) {
      advancePhaseManually(container)
    }
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init(container: HTMLElement): void {
  const data = loadData()

  container.innerHTML = `
    <h2>Rutina de Entrenamiento</h2>
    ${renderPhaseCards()}
    ${renderAdvancementSection(data.currentPhase)}
  `

  wireAdvancementButton(container)

  // Re-render advancement section when phase changes
  AppState.getInstance().on("phase:changed", () => {
    rerenderAdvancement(container)
  })
}
