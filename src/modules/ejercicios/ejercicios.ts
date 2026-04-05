import { AppState } from "@core/state"
import type { ExerciseId, Phase } from "@core/types"
import { EXERCISE_IDS } from "@core/types"
import { loadData } from "@core/storage"
import { IsometricTimer } from "@modules/timer/timer"

// ---------------------------------------------------------------------------
// Isometric timer durations per phase (secs)
// ---------------------------------------------------------------------------

const ISOMETRIC_DURATIONS: Record<ExerciseId, Record<Phase, number>> = {
  [EXERCISE_IDS.PLANK]: { 1: 30, 2: 50, 3: 65, 4: 80 },
  [EXERCISE_IDS.WALLSIT]: { 1: 35, 2: 50, 3: 65, 4: 80 },
  [EXERCISE_IDS.PUSH]: { 1: 0, 2: 0, 3: 0, 4: 0 },
  [EXERCISE_IDS.ROW]: { 1: 0, 2: 0, 3: 0, 4: 0 },
  [EXERCISE_IDS.BRIDGE]: { 1: 0, 2: 0, 3: 0, 4: 0 },
  [EXERCISE_IDS.BIRDDOG]: { 1: 0, 2: 0, 3: 0, 4: 0 },
}

// ---------------------------------------------------------------------------
// Exercise definitions
// ---------------------------------------------------------------------------

interface ExerciseDetail {
  id: string
  name: string
  category: string
  categoryClass: string
  muscles: string
  technique: string[]
  doList: string[]
  dontList: string[]
  progression: string[]
  isometricId?: ExerciseId
}

const CALENTAMIENTO_EXERCISES: ExerciseDetail[] = [
  {
    id: "circulos-munecas",
    name: "Círculos de muñecas",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Flexores/extensores de muñeca, pronadores, supinadores",
    technique: [
      "Extendé ambos brazos hacia adelante al nivel del pecho",
      "Hacé círculos lentos con las muñecas, 10 en cada dirección",
      "Aumentá el rango de movimiento gradualmente",
    ],
    doList: [
      "Movimiento fluido y controlado",
      "Rango completo de movimiento",
      "Respiración normal",
    ],
    dontList: [
      "Movimientos bruscos",
      "Ignorar dolor o crepitación",
    ],
    progression: [
      "Velocidad: comenzar lento, acelerar",
      "Agregar carga progresiva con peso ligero",
    ],
  },
  {
    id: "circulos-hombros",
    name: "Círculos de hombros",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Deltoides, manguito rotador, trapecio",
    technique: [
      "Posición erguida, brazos relajados a los costados",
      "Rotá los hombros hacia adelante 10 veces",
      "Luego hacia atrás 10 veces",
      "Aumentá el rango progresivamente",
    ],
    doList: [
      "Rango completo de movimiento",
      "Movimiento sincronizado de ambos hombros",
    ],
    dontList: [
      "Elevar el cuello al rotar",
      "Arquearse hacia atrás",
    ],
    progression: [
      "Brazos extendidos para mayor palanca",
      "Integrar con movimiento de torso",
    ],
  },
  {
    id: "rotaciones-cadera",
    name: "Rotaciones de cadera",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Flexores de cadera, glúteos, oblicuos",
    technique: [
      "Parado con piernas al ancho de hombros",
      "Manos en caderas",
      "Círculos amplios con la pelvis, 10 × lado",
    ],
    doList: [
      "Círculo completo y fluido",
      "Rodillas ligeramente flexionadas",
    ],
    dontList: [
      "Mover los hombros excesivamente",
      "Bloquear las rodillas",
    ],
    progression: [
      "Agregar rotación de torso simultánea",
    ],
  },
  {
    id: "cat-cow",
    name: "Cat-Cow",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Columna vertebral completa, core, trapecio",
    technique: [
      "En cuatro apoyos: rodillas bajo caderas, muñecas bajo hombros",
      "Cow: inhalar, bajar abdomen, levantar cabeza y cóccix",
      "Cat: exhalar, arquear espalda al cielo, bajar cabeza y cóccix",
      "Movimiento lento y continuo, 10 repeticiones",
    ],
    doList: [
      "Sincronizar respiración con movimiento",
      "Movimiento segmento por segmento",
      "Rango completo sin forzar",
    ],
    dontList: [
      "Apoyar cargas en las muñecas doloridas",
      "Movimiento brusco o sin control",
    ],
    progression: [
      "Agregar pausa de 2s en cada extremo",
      "Thread the needle: rotación de columna",
    ],
  },
  {
    id: "marcha-lugar",
    name: "Marcha en el lugar",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Flexores de cadera, cuádriceps, pantorrillas, sistema cardiovascular",
    technique: [
      "Posición erguida, core activado",
      "Elevar rodillas alternadamente hasta la cadera",
      "Braceo natural opuesto a la pierna",
      "60–90 segundos a ritmo moderado",
    ],
    doList: [
      "Rodillas al menos a 90° de flexión",
      "Aterrizar suavemente en el mediopié",
      "Mantener torso erguido",
    ],
    dontList: [
      "Inclinar el torso hacia adelante",
      "Golpear con el talón fuerte",
    ],
    progression: [
      "Aumentar elevación de rodilla",
      "Agregar braceo con pesas ligeras",
      "Rodillas al pecho (high knees)",
    ],
  },
  {
    id: "glute-bridges-suaves",
    name: "Glute bridges suaves",
    category: "Calentamiento",
    categoryClass: "ph",
    muscles: "Glúteo mayor, isquiotibiales, core lumbar",
    technique: [
      "Tumbado boca arriba, rodillas flexionadas a 90°, pies planos",
      "Activar core y glúteos antes de subir",
      "Elevar caderas hasta alinear rodillas-caderas-hombros",
      "Pausa breve arriba, bajar controlado",
    ],
    doList: [
      "Presionar los talones contra el suelo",
      "Mantener rodillas alineadas con los pies",
    ],
    dontList: [
      "Hiperlordosis lumbar arriba",
      "Rodillas que colapsan hacia adentro",
    ],
    progression: [
      "Aumentar la pausa en la cima",
      "Versión unilateral",
    ],
  },
]

const CIRCUITO_EXERCISES: ExerciseDetail[] = [
  {
    id: "push-ups",
    name: "Push-ups",
    category: "Push",
    categoryClass: "ph ph--1",
    muscles: "Pectoral mayor, deltoides anterior, tríceps, serrato anterior",
    technique: [
      "Manos al ancho de hombros, dedos apuntando levemente hacia afuera",
      "Core completamente activado — no dejes caer la cadera",
      "Bajar controlado en 2 segundos hasta que el pecho casi toque el suelo",
      "Empujar explosivamente hasta extensión completa",
      "Codos a 45° del cuerpo — NO abiertos a 90°",
    ],
    doList: [
      "Cuerpo rígido como tabla de principio a fin",
      "Rango completo de movimiento",
      "Respirar: inhalar al bajar, exhalar al subir",
      "Mirada al suelo (cuello neutro)",
    ],
    dontList: [
      "Cadera elevada (\"carpita\")",
      "Cadera hundida (caída lumbar)",
      "Codos abiertos a 90° (lesión de hombro)",
      "Medio rango de movimiento",
    ],
    progression: [
      "F1: Push-ups estándar 3 × 8–12",
      "F2: Push-ups lentos 4 × 10–15 (3s bajada)",
      "F3: Push-ups con pies elevados 4 × 15–20",
      "F4: Push-ups pies en silla + pausa 5 × 15–20",
    ],
  },
  {
    id: "remo-toalla",
    name: "Remo con toalla/puerta",
    category: "Pull",
    categoryClass: "ph ph--2",
    muscles: "Dorsal ancho, romboides, bíceps, infraespinoso, deltoides posterior",
    technique: [
      "Abrí una puerta a 90° y asegurá una toalla doblada en el picaporte",
      "Agarrá los extremos de la toalla, incliná el cuerpo hacia atrás",
      "Pies planos, rodillas ligeramente flexionadas como anclaje",
      "Jalá hacia tu ombligo llevando los codos atrás",
      "Escápulas retraídas y deprimidas al final del movimiento",
    ],
    doList: [
      "Cuerpo recto como tabla durante todo el movimiento",
      "Retracción escapular al final",
      "Codos cerca del cuerpo",
      "Controlá la vuelta — no dejes caer",
    ],
    dontList: [
      "Usar el impulso del cuerpo (swing)",
      "Redondear los hombros",
      "Cabeza que cae hacia adelante",
    ],
    progression: [
      "F1: Ángulo 45° (más fácil) 3 × 10–15",
      "F2: Ángulo 30° 4 × 12–18",
      "F3: Ángulo casi horizontal 4 × 15–18",
      "F4: Horizontal completo, pies elevados 5 × 15–20",
    ],
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: "Lower",
    categoryClass: "ph ph--1",
    muscles: "Glúteo mayor (primario), isquiotibiales, core lumbar, glúteo medio",
    technique: [
      "Tumbado boca arriba, rodillas a 90°, pies al ancho de cadera",
      "Activar core — zona lumbar en posición neutra",
      "Presionar talones, elevar caderas contrayendo glúteos",
      "Cima: rodillas-cadera-hombros alineados",
      "Bajar en 2 segundos hasta casi tocar el suelo",
    ],
    doList: [
      "Apretar los glúteos en la cima",
      "Presionar los talones, no las puntas",
      "Rodillas alineadas con pies (no hacia adentro)",
    ],
    dontList: [
      "Hiperlordosis en la cima",
      "Rodillas colapsando hacia adentro",
      "Subir con la espalda en lugar de los glúteos",
    ],
    progression: [
      "F1: Bilateral 3 × 15–20",
      "F2: Con pausa de 3s 4 × 15–20",
      "F3: Unilateral 4 × 12 × lado",
      "F4: Unilateral con elevación 5 × 12 × lado",
    ],
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    category: "Lower",
    categoryClass: "ph ph--3",
    muscles: "Cuádriceps, glúteos, isquiotibiales, pantorrillas",
    technique: [
      "Espalda completamente plana contra la pared",
      "Bajar hasta que rodillas estén a 90°",
      "Pies al ancho de hombros, ligeramente hacia adelante",
      "Rodillas directamente sobre tobillos (no hacia adelante)",
      "Mantener la posición el tiempo objetivo",
    ],
    doList: [
      "Espalda plana en contacto con la pared",
      "90° en rodillas (o menos para mayor dificultad)",
      "Peso distribuido uniformemente en ambos pies",
      "Respiración constante durante el hold",
    ],
    dontList: [
      "Rodillas pasando los dedos del pie",
      "Espalda separada de la pared",
      "Apoyarse con las manos en los muslos",
    ],
    progression: [
      "F1: 3 × 30–40 s",
      "F2: 4 × 40–60 s",
      "F3: 4 × 60–75 s",
      "F4: 5 × máximo + pausa intermitente",
    ],
    isometricId: EXERCISE_IDS.WALLSIT,
  },
  {
    id: "plank",
    name: "Plank de antebrazos",
    category: "Core",
    categoryClass: "ph ph--4",
    muscles: "Recto abdominal, transverso, oblicuos, glúteos, cuádriceps, serratos",
    technique: [
      "Apoyarse en antebrazos y puntas de pies",
      "Codos directamente bajo los hombros",
      "Cuerpo recto de cabeza a talones — sin arquear ni elevar la cadera",
      "Activar glúteos, cuádriceps y core simultáneamente",
      "Respiración diafragmática — no apnea",
    ],
    doList: [
      "Apretar todos los músculos al mismo tiempo",
      "Mirar al suelo con el cuello neutro",
      "Mantener la posición hasta el tiempo objetivo",
    ],
    dontList: [
      "Cadera elevada (pirámide)",
      "Cadera hundida (banana)",
      "Apnea — hay que respirar",
      "Cuello hiperextendido mirando al frente",
    ],
    progression: [
      "F1: 3 × 20–40 s",
      "F2: 4 × 40–60 s",
      "F3: Plank con elevación de brazo 4 × 60–75 s",
      "F4: Plank dinámico con tap de hombro 5 × 75+ s",
    ],
    isometricId: EXERCISE_IDS.PLANK,
  },
  {
    id: "bird-dog",
    name: "Bird-Dog",
    category: "Core",
    categoryClass: "ph ph--4",
    muscles: "Multífidos, transverso abdominal, glúteo mayor, deltoides posterior",
    technique: [
      "En cuatro apoyos: rodillas bajo caderas, muñecas bajo hombros",
      "Extender simultáneamente el brazo derecho y pierna izquierda",
      "Mantener cadera nivelada — no rotar el tronco",
      "Volver al centro controladamente",
      "Alternar lados: eso es 1 repetición completa",
    ],
    doList: [
      "Cadera completamente nivelada durante la extensión",
      "Movimiento lento y controlado (2s extender, 2s volver)",
      "Core activado continuamente",
    ],
    dontList: [
      "Rotar la cadera para alcanzar más rango",
      "Arquear la espalda lumbar",
      "Movimiento rápido o con impulso",
    ],
    progression: [
      "F1: 3 × 10 × lado",
      "F2: Con pausa de 2s extendido",
      "F3: Superficie inestable (cojín) bajo las rodillas",
      "F4: Con bandas de resistencia en tobillos",
    ],
  },
  {
    id: "dead-bug",
    name: "Dead Bug",
    category: "Core",
    categoryClass: "ph ph--4",
    muscles: "Transverso abdominal, recto abdominal, flexores de cadera, diafragma",
    technique: [
      "Tumbado boca arriba, brazos extendidos al cielo, rodillas a 90° elevadas",
      "Presionar la zona lumbar contra el suelo — crucial",
      "Bajar lentamente brazo derecho arriba y pierna izquierda abajo simultáneamente",
      "Sin tocar el suelo, volver a posición inicial",
      "Alternar lados: eso es 1 rep",
    ],
    doList: [
      "Zona lumbar pegada al suelo en todo momento",
      "Respirar durante el movimiento",
      "Movimiento lento (3–4 segundos por lado)",
    ],
    dontList: [
      "Separar la espalda baja del suelo",
      "Apnea (contener la respiración)",
      "Doblar las rodillas más de 90°",
    ],
    progression: [
      "F1: Solo piernas (sin brazos)",
      "F2: Completo 4 × 8 × lado",
      "F3: Con peso ligero en las manos",
      "F4: Con banda de resistencia en pies",
    ],
  },
  {
    id: "superman",
    name: "Superman",
    category: "Core",
    categoryClass: "ph ph--4",
    muscles: "Erector espinal, glúteos, deltoides posterior, isquiotibiales",
    technique: [
      "Tumbado boca abajo, brazos extendidos al frente",
      "Activar glúteos y espalda baja",
      "Elevar brazos, pecho y piernas simultáneamente del suelo",
      "Mantener 2 segundos arriba, bajar 2 segundos",
      "Mirada al suelo (cuello neutro)",
    ],
    doList: [
      "Activar glúteos antes de subir",
      "Movimiento suave y controlado",
      "Cuello neutro — no forzar la extensión cervical",
    ],
    dontList: [
      "Arqueo excesivo en la zona lumbar",
      "Hiperextensión cervical (levantar la cabeza mucho)",
      "Movimiento brusco",
    ],
    progression: [
      "F1: Solo piernas",
      "F2: Solo brazos",
      "F3: Completo 5 × 12 (2s arriba)",
      "F4: Con peso ligero en manos y tobillos",
    ],
  },
  {
    id: "hollow-hold",
    name: "Hollow Hold",
    category: "Core",
    categoryClass: "ph ph--4",
    muscles: "Transverso abdominal, recto abdominal, iliopsoas, cuádriceps",
    technique: [
      "Tumbado boca arriba, brazos extendidos arriba de la cabeza",
      "Comprimir el core y presionar la zona lumbar al suelo",
      "Elevar hombros, brazos y piernas ligeramente del suelo",
      "Posición de \"banana invertida\" — sin arquear la espalda",
      "Mantener la posición con respiración controlada",
    ],
    doList: [
      "Zona lumbar pegada al suelo durante todo el hold",
      "Brazos junto a las orejas (no abiertos)",
      "Respiración diafragmática",
    ],
    dontList: [
      "Separar la espalda del suelo",
      "Contener la respiración",
      "Abrir los brazos al costado",
    ],
    progression: [
      "F1: Rodillas a 90° (más fácil)",
      "F2: Piernas extendidas a 45°",
      "F3: 20–30 s con piernas casi rectas",
      "F4: Con pequeños balanceos (rocas)",
    ],
  },
]

const ENFRIAMIENTO_EXERCISES: ExerciseDetail[] = [
  {
    id: "estiramiento-pectoral",
    name: "Estiramiento pectoral",
    category: "Enfriamiento",
    categoryClass: "ph",
    muscles: "Pectoral mayor, bíceps, deltoides anterior",
    technique: [
      "Parado en un marco de puerta",
      "Apoyar antebrazo en el marco a 90°",
      "Girar el cuerpo hacia el lado opuesto",
      "Mantener 30–45 segundos por lado",
    ],
    doList: [
      "Sensación de estiramiento, no dolor",
      "Respiración profunda",
    ],
    dontList: [
      "Forzar el estiramiento con rebotes",
    ],
    progression: [
      "Bajar el brazo (estira porción clavicular)",
      "Subir el brazo (estira porción esternal)",
    ],
  },
  {
    id: "flexor-cadera",
    name: "Flexor de cadera",
    category: "Enfriamiento",
    categoryClass: "ph",
    muscles: "Iliopsoas, cuádriceps, recto femoral",
    technique: [
      "Rodilla derecha en el suelo (media rodilla)",
      "Pie izquierdo adelante, rodilla a 90°",
      "Empujar cadera hacia adelante suavemente",
      "30–45 segundos, cambiar lado",
    ],
    doList: [
      "Pelvis en posición neutra (no en anteversión)",
      "Torso erguido",
    ],
    dontList: [
      "Arquear excesivamente la zona lumbar",
    ],
    progression: [
      "Brazo del lado de atrás extendido arriba",
      "Agregar rotación leve del torso",
    ],
  },
  {
    id: "isquiotibiales",
    name: "Isquiotibiales",
    category: "Enfriamiento",
    categoryClass: "ph",
    muscles: "Isquiotibiales, glúteos, gastrocnemio proximal",
    technique: [
      "Sentado en el suelo, pierna a estirar extendida",
      "Flexionar la otra pierna hacia adentro",
      "Inclinar el tronco hacia la pierna extendida",
      "30–45 segundos por lado, sin rebotes",
    ],
    doList: [
      "Espalda relativamente recta al inclinarse",
      "Punta del pie neutra o levemente hacia ti",
    ],
    dontList: [
      "Redondear completamente la espalda",
      "Rebotes (stretching balístico)",
    ],
    progression: [
      "Banda elástica en el pie para más rango",
      "Estiramiento activo: contracciones cortas",
    ],
  },
  {
    id: "cuadriceps",
    name: "Cuádriceps",
    category: "Enfriamiento",
    categoryClass: "ph",
    muscles: "Cuádriceps, recto femoral proximal",
    technique: [
      "De pie, apoyar mano en pared si es necesario",
      "Flexionar rodilla, llevar talón hacia el glúteo",
      "Mantener las rodillas juntas y el torso erguido",
      "30–45 segundos por lado",
    ],
    doList: [
      "Rodillas alineadas (no adelantar la rodilla a estirar)",
      "Activar el glúteo del mismo lado",
    ],
    dontList: [
      "Inclinar excesivamente el torso",
      "Separar las rodillas lateralmente",
    ],
    progression: [
      "Tumbado de lado para mayor estiramiento",
    ],
  },
  {
    id: "respiracion-diafragmatica",
    name: "Respiración diafragmática",
    category: "Enfriamiento",
    categoryClass: "ph",
    muscles: "Diafragma, intercostales, sistema parasimpático",
    technique: [
      "Tumbado boca arriba o sentado cómodamente",
      "Una mano en el pecho, otra en el abdomen",
      "Inhalar por la nariz en 4 tiempos — solo sube la mano del abdomen",
      "Retener 2 tiempos",
      "Exhalar por la boca en 6 tiempos",
      "Repetir por 2–3 minutos",
    ],
    doList: [
      "Inhalar con el abdomen, no con el pecho",
      "Exhalar completamente",
      "Ambiente tranquilo si es posible",
    ],
    dontList: [
      "Forzar la respiración",
      "Tensionar hombros al inhalar",
    ],
    progression: [
      "4-7-8: inhalar 4, retener 7, exhalar 8",
      "Integrar en la práctica diaria fuera del entrenamiento",
    ],
  },
]

// ---------------------------------------------------------------------------
// Accordion item renderer
// ---------------------------------------------------------------------------

function renderTimerButton(ex: ExerciseDetail, currentPhase: Phase): string {
  if (!ex.isometricId) return ""
  const secs = ISOMETRIC_DURATIONS[ex.isometricId][currentPhase]
  if (!secs) return ""
  return `
    <div style="margin-top:var(--sp4)">
      <button class="btn btn--primary" data-timer-exercise="${ex.isometricId}" data-timer-secs="${secs}">
        ⏱ Iniciar timer — ${secs} segs (Fase ${currentPhase})
      </button>
      <div class="timer-display" id="timer-display-${ex.isometricId}" style="display:none;font-size:2rem;padding:var(--sp3) 0"></div>
    </div>
  `
}

function renderExerciseItem(ex: ExerciseDetail, currentPhase: Phase): string {
  const techHtml = ex.technique
    .map((step, i) => `<li>${i + 1}. ${step}</li>`)
    .join("")

  const doHtml = ex.doList.map((d) => `<li style="color:var(--green)">✓ ${d}</li>`).join("")
  const dontHtml = ex.dontList.map((d) => `<li style="color:var(--red)">✗ ${d}</li>`).join("")
  const progHtml = ex.progression.map((p) => `<li>${p}</li>`).join("")

  const timerHtml = renderTimerButton(ex, currentPhase)

  return `
    <div class="accordion" id="accordion-${ex.id}">
      <button class="accordion__trigger" data-accordion="${ex.id}">
        <span>
          <span class="${ex.categoryClass}" style="margin-right:var(--sp2)">${ex.category}</span>
          ${ex.name}
        </span>
        <svg class="accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="accordion__body" id="body-${ex.id}">
        <p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:var(--sp3)">
          <strong>Músculos:</strong> ${ex.muscles}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp4);margin-bottom:var(--sp4)">
          <div>
            <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-dim);margin-bottom:var(--sp2)">Técnica</div>
            <ul style="list-style:none;color:var(--text);font-size:0.88rem;line-height:1.7">${techHtml}</ul>
          </div>
          <div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp3)">
              <div>
                <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--green);margin-bottom:var(--sp2)">Hacé</div>
                <ul style="list-style:none;font-size:0.82rem;line-height:1.7">${doHtml}</ul>
              </div>
              <div>
                <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--red);margin-bottom:var(--sp2)">No hagas</div>
                <ul style="list-style:none;font-size:0.82rem;line-height:1.7">${dontHtml}</ul>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:var(--sp2)">Progresión por fase</div>
          <ul style="list-style:none;font-size:0.85rem;color:var(--text);line-height:1.7">${progHtml}</ul>
        </div>
        ${timerHtml}
      </div>
    </div>
  `
}

function renderGroup(title: string, exercises: ExerciseDetail[], currentPhase: Phase): string {
  return `
    <div style="margin-bottom:var(--sp5)">
      <h3 style="border-bottom:1px solid var(--border);padding-bottom:var(--sp2);margin-bottom:var(--sp3)">${title}</h3>
      ${exercises.map((ex) => renderExerciseItem(ex, currentPhase)).join("")}
    </div>
  `
}

// ---------------------------------------------------------------------------
// Timer wiring
// ---------------------------------------------------------------------------

function wireTimers(container: HTMLElement): void {
  container.querySelectorAll<HTMLButtonElement>("[data-timer-exercise]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const exerciseId = btn.dataset["timerExercise"] as ExerciseId
      const secs = Number(btn.dataset["timerSecs"])
      if (!exerciseId || !secs) return

      const displayEl = container.querySelector<HTMLElement>(`#timer-display-${exerciseId}`)
      if (!displayEl) return

      displayEl.style.display = "block"

      const timer = new IsometricTimer(
        exerciseId,
        secs,
        (remaining) => {
          displayEl.textContent = `${remaining}s`
          displayEl.className = "timer-display timer-active"
        },
        () => {
          displayEl.textContent = "¡Completado!"
          displayEl.className = "timer-display timer-display--done"
        },
      )

      timer.start()

      // Swap button to cancel
      btn.textContent = "Cancelar timer"
      btn.classList.remove("btn--primary")
      btn.classList.add("btn--danger")

      btn.addEventListener(
        "click",
        () => {
          timer.cancel()
          displayEl.style.display = "none"
          btn.textContent = `⏱ Iniciar timer — ${secs} segs`
          btn.classList.add("btn--primary")
          btn.classList.remove("btn--danger")
        },
        { once: true },
      )
    })
  })
}

// ---------------------------------------------------------------------------
// Accordion wiring
// ---------------------------------------------------------------------------

function wireAccordions(container: HTMLElement): void {
  container.querySelectorAll<HTMLButtonElement>("[data-accordion]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const id = trigger.dataset["accordion"]
      if (!id) return

      const body = container.querySelector<HTMLElement>(`#body-${id}`)
      if (!body) return

      const isOpen = body.classList.contains("open")

      if (isOpen) {
        body.classList.remove("open")
        trigger.classList.remove("open")
      } else {
        body.classList.add("open")
        trigger.classList.add("open")
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init(container: HTMLElement): void {
  const data = loadData()
  const currentPhase = data.currentPhase

  container.innerHTML = `
    <h2>Ejercicios</h2>
    <p style="color:var(--text-dim);margin-bottom:var(--sp5)">
      Guía técnica completa. Expandí cada ejercicio para ver técnica, cues y progresión.
    </p>
    ${renderGroup("Calentamiento", CALENTAMIENTO_EXERCISES, currentPhase)}
    ${renderGroup("Circuito Principal", CIRCUITO_EXERCISES, currentPhase)}
    ${renderGroup("Enfriamiento", ENFRIAMIENTO_EXERCISES, currentPhase)}
  `

  wireAccordions(container)
  wireTimers(container)

  // Re-render on phase change (timer durations update)
  AppState.getInstance().on("phase:changed", () => {
    init(container)
  })
}
