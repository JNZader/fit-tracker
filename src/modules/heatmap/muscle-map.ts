import type { ExerciseId } from "@core/types"

// ---------------------------------------------------------------------------
// MUSCLE_IDS — 36 muscles, single source of truth
// ---------------------------------------------------------------------------
export const MUSCLE_IDS = {
  // Chest
  PECTORALS: "pectorals",
  PECTORALS_MINOR: "pectorals-minor",

  // Shoulders
  ANTERIOR_DELTOID: "anterior-deltoid",
  LATERAL_DELTOID: "lateral-deltoid",
  POSTERIOR_DELTOID: "posterior-deltoid",
  ROTATOR_CUFF: "rotator-cuff",

  // Arms
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  BRACHIALIS: "brachialis",

  // Back
  UPPER_TRAPS: "upper-traps",
  LOWER_TRAPS: "lower-traps",
  RHOMBOIDS: "rhomboids",
  LATS: "lats",
  ERECTOR_SPINAE: "erector-spinae",
  TERES_MAJOR: "teres-major",

  // Core
  RECTUS_ABDOMINIS: "rectus-abdominis",
  OBLIQUES: "obliques",
  TRANSVERSE_ABDOMINIS: "transverse-abdominis",
  SERRATUS: "serratus",

  // Hip
  HIP_FLEXORS: "hip-flexors",
  GLUTES: "glutes",
  GLUTEUS_MEDIUS: "gluteus-medius",

  // Upper legs
  QUADS: "quads",
  HAMSTRINGS: "hamstrings",
  ADDUCTORS: "adductors",
  ABDUCTORS: "abductors",

  // Lower legs
  CALVES: "calves",
  TIBIALIS: "tibialis",
  SOLEUS: "soleus",

  // Additional
  NECK_FLEXORS: "neck-flexors",
  NECK_EXTENSORS: "neck-extensors",
  LEVATOR_SCAPULAE: "levator-scapulae",
  INFRASPINATUS: "infraspinatus",
  PELVIC_FLOOR: "pelvic-floor",
  DIAPHRAGM: "diaphragm",
} as const

export type MuscleId = (typeof MUSCLE_IDS)[keyof typeof MUSCLE_IDS]

// ---------------------------------------------------------------------------
// MuscleInfo
// ---------------------------------------------------------------------------
export interface MuscleInfo {
  id: MuscleId
  label: string
  group: "front" | "back"
  region: "chest" | "back" | "arms" | "legs" | "core" | "shoulders"
}

export const MUSCLES: Record<MuscleId, MuscleInfo> = {
  // Chest (front)
  "pectorals":       { id: "pectorals",       label: "Pectorals",           group: "front", region: "chest" },
  "pectorals-minor": { id: "pectorals-minor", label: "Pectoralis Minor",   group: "front", region: "chest" },

  // Shoulders
  "anterior-deltoid":  { id: "anterior-deltoid",  label: "Anterior Deltoid",  group: "front", region: "shoulders" },
  "lateral-deltoid":   { id: "lateral-deltoid",   label: "Lateral Deltoid",   group: "front", region: "shoulders" },
  "posterior-deltoid":  { id: "posterior-deltoid",  label: "Posterior Deltoid",  group: "back",  region: "shoulders" },
  "rotator-cuff":      { id: "rotator-cuff",      label: "Rotator Cuff",      group: "back",  region: "shoulders" },

  // Arms
  "biceps":     { id: "biceps",     label: "Biceps",     group: "front", region: "arms" },
  "triceps":    { id: "triceps",    label: "Triceps",    group: "back",  region: "arms" },
  "forearms":   { id: "forearms",   label: "Forearms",   group: "front", region: "arms" },
  "brachialis": { id: "brachialis", label: "Brachialis", group: "front", region: "arms" },

  // Back
  "upper-traps":    { id: "upper-traps",    label: "Upper Trapezius",  group: "back", region: "back" },
  "lower-traps":    { id: "lower-traps",    label: "Lower Trapezius",  group: "back", region: "back" },
  "rhomboids":      { id: "rhomboids",      label: "Rhomboids",        group: "back", region: "back" },
  "lats":           { id: "lats",           label: "Latissimus Dorsi", group: "back", region: "back" },
  "erector-spinae": { id: "erector-spinae", label: "Erector Spinae",   group: "back", region: "back" },
  "teres-major":    { id: "teres-major",    label: "Teres Major",      group: "back", region: "back" },

  // Core
  "rectus-abdominis":     { id: "rectus-abdominis",     label: "Rectus Abdominis",     group: "front", region: "core" },
  "obliques":             { id: "obliques",             label: "Obliques",             group: "front", region: "core" },
  "transverse-abdominis": { id: "transverse-abdominis", label: "Transverse Abdominis", group: "front", region: "core" },
  "serratus":             { id: "serratus",             label: "Serratus Anterior",    group: "front", region: "core" },

  // Hip
  "hip-flexors":    { id: "hip-flexors",    label: "Hip Flexors",    group: "front", region: "legs" },
  "glutes":         { id: "glutes",         label: "Gluteus Maximus", group: "back",  region: "legs" },
  "gluteus-medius": { id: "gluteus-medius", label: "Gluteus Medius", group: "back",  region: "legs" },

  // Upper legs
  "quads":     { id: "quads",     label: "Quadriceps", group: "front", region: "legs" },
  "hamstrings": { id: "hamstrings", label: "Hamstrings", group: "back",  region: "legs" },
  "adductors": { id: "adductors", label: "Adductors",  group: "front", region: "legs" },
  "abductors": { id: "abductors", label: "Abductors",  group: "back",  region: "legs" },

  // Lower legs
  "calves":   { id: "calves",   label: "Calves (Gastrocnemius)", group: "back",  region: "legs" },
  "tibialis": { id: "tibialis", label: "Tibialis Anterior",     group: "front", region: "legs" },
  "soleus":   { id: "soleus",   label: "Soleus",                group: "back",  region: "legs" },

  // Additional
  "neck-flexors":    { id: "neck-flexors",    label: "Neck Flexors",    group: "front", region: "shoulders" },
  "neck-extensors":  { id: "neck-extensors",  label: "Neck Extensors",  group: "back",  region: "shoulders" },
  "levator-scapulae": { id: "levator-scapulae", label: "Levator Scapulae", group: "back", region: "shoulders" },
  "infraspinatus":   { id: "infraspinatus",   label: "Infraspinatus",   group: "back",  region: "shoulders" },
  "pelvic-floor":    { id: "pelvic-floor",    label: "Pelvic Floor",    group: "front", region: "core" },
  "diaphragm":       { id: "diaphragm",       label: "Diaphragm",       group: "front", region: "core" },
}

// ---------------------------------------------------------------------------
// MuscleActivation
// ---------------------------------------------------------------------------
export interface MuscleActivation {
  muscleId: MuscleId
  exerciseId: ExerciseId
  weight: 1.0 | 0.5 | 0.25
  role: "primary" | "secondary" | "stabilizer"
}

// ---------------------------------------------------------------------------
// EXERCISE_MUSCLE_MAP
// ---------------------------------------------------------------------------
export const EXERCISE_MUSCLE_MAP: Record<ExerciseId, MuscleActivation[]> = {
  push: [
    { muscleId: "pectorals",        exerciseId: "push", weight: 1.0,  role: "primary" },
    { muscleId: "anterior-deltoid", exerciseId: "push", weight: 1.0,  role: "primary" },
    { muscleId: "triceps",          exerciseId: "push", weight: 1.0,  role: "primary" },
    { muscleId: "serratus",         exerciseId: "push", weight: 0.5,  role: "secondary" },
    { muscleId: "rectus-abdominis", exerciseId: "push", weight: 0.25, role: "stabilizer" },
    { muscleId: "quads",            exerciseId: "push", weight: 0.25, role: "stabilizer" },
  ],
  row: [
    { muscleId: "lats",              exerciseId: "row", weight: 1.0,  role: "primary" },
    { muscleId: "rhomboids",         exerciseId: "row", weight: 1.0,  role: "primary" },
    { muscleId: "posterior-deltoid", exerciseId: "row", weight: 1.0,  role: "primary" },
    { muscleId: "biceps",            exerciseId: "row", weight: 0.5,  role: "secondary" },
    { muscleId: "lower-traps",       exerciseId: "row", weight: 0.5,  role: "secondary" },
    { muscleId: "forearms",          exerciseId: "row", weight: 0.25, role: "stabilizer" },
  ],
  bridge: [
    { muscleId: "glutes",         exerciseId: "bridge", weight: 1.0,  role: "primary" },
    { muscleId: "hamstrings",     exerciseId: "bridge", weight: 0.5,  role: "secondary" },
    { muscleId: "erector-spinae", exerciseId: "bridge", weight: 0.5,  role: "secondary" },
    { muscleId: "quads",          exerciseId: "bridge", weight: 0.25, role: "stabilizer" },
  ],
  plank: [
    { muscleId: "rectus-abdominis",     exerciseId: "plank", weight: 1.0,  role: "primary" },
    { muscleId: "obliques",             exerciseId: "plank", weight: 1.0,  role: "primary" },
    { muscleId: "transverse-abdominis", exerciseId: "plank", weight: 1.0,  role: "primary" },
    { muscleId: "erector-spinae",       exerciseId: "plank", weight: 0.5,  role: "secondary" },
    { muscleId: "anterior-deltoid",     exerciseId: "plank", weight: 0.25, role: "stabilizer" },
    { muscleId: "quads",                exerciseId: "plank", weight: 0.25, role: "stabilizer" },
  ],
  wallsit: [
    { muscleId: "quads",       exerciseId: "wallsit", weight: 1.0,  role: "primary" },
    { muscleId: "glutes",      exerciseId: "wallsit", weight: 0.5,  role: "secondary" },
    { muscleId: "calves",      exerciseId: "wallsit", weight: 0.25, role: "stabilizer" },
    { muscleId: "hip-flexors", exerciseId: "wallsit", weight: 0.25, role: "stabilizer" },
  ],
  birddog: [
    { muscleId: "erector-spinae",    exerciseId: "birddog", weight: 1.0,  role: "primary" },
    { muscleId: "glutes",            exerciseId: "birddog", weight: 0.5,  role: "secondary" },
    { muscleId: "rectus-abdominis",  exerciseId: "birddog", weight: 0.5,  role: "secondary" },
    { muscleId: "posterior-deltoid", exerciseId: "birddog", weight: 0.25, role: "stabilizer" },
    { muscleId: "hamstrings",        exerciseId: "birddog", weight: 0.25, role: "stabilizer" },
  ],
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getMusclesForExercise(exerciseId: ExerciseId): MuscleActivation[] {
  return EXERCISE_MUSCLE_MAP[exerciseId] ?? []
}

export function getExercisesForMuscle(muscleId: MuscleId): MuscleActivation[] {
  const results: MuscleActivation[] = []
  for (const activations of Object.values(EXERCISE_MUSCLE_MAP)) {
    for (const act of activations) {
      if (act.muscleId === muscleId) {
        results.push(act)
      }
    }
  }
  return results
}

export function getAllMuscleGroups(): Record<"front" | "back", MuscleInfo[]> {
  const front: MuscleInfo[] = []
  const back: MuscleInfo[] = []
  for (const info of Object.values(MUSCLES)) {
    if (info.group === "front") front.push(info)
    else back.push(info)
  }
  return { front, back }
}
