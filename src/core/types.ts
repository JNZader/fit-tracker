import { z } from "zod"

// --- Const maps (single source of truth) ---

export const EXERCISE_IDS = {
  PUSH: "push",
  ROW: "row",
  BRIDGE: "bridge",
  PLANK: "plank",
  WALLSIT: "wallsit",
  BIRDDOG: "birddog",
} as const

export const EXERCISE_UNITS = {
  REPS: "reps",
  SECS: "secs",
} as const

export const PHASES = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
} as const

export const PAIN_ZONES = {
  NO: "No",
  RODILLA: "Rodilla",
  HOMBRO: "Hombro",
  LUMBAR: "Lumbar",
  MUNECA: "Muñeca",
  OTRO: "Otro",
} as const

export const SNAPSHOT_SOURCES = {
  IMPORT: "import",
  PHASE_CHANGE: "phase-change",
  MANUAL: "manual",
} as const

export const TAB_IDS = {
  RUTINA: "rutina",
  EJERCICIOS: "ejercicios",
  SISTEMA: "sistema",
  TRACKING: "tracking",
} as const

// --- Derived types ---

export type ExerciseId = (typeof EXERCISE_IDS)[keyof typeof EXERCISE_IDS]
export type ExerciseUnit = (typeof EXERCISE_UNITS)[keyof typeof EXERCISE_UNITS]
export type Phase = (typeof PHASES)[keyof typeof PHASES]
export type PainZone = (typeof PAIN_ZONES)[keyof typeof PAIN_ZONES]
export type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS]

// --- Interfaces (flat, one-level) ---

export interface ExerciseConfig {
  id: ExerciseId
  label: string
  unit: ExerciseUnit
  cat: "push" | "pull" | "lower" | "core"
}

export interface SessionRecord {
  date: string // YYYY-MM-DD
  exercises: Partial<Record<ExerciseId, number[]>>
  rpe?: number
  feeling?: 1 | 2 | 3 | 4 | 5
  pain?: PainZone
  notes?: string
}

export interface PRRecord {
  date: string
  value: number
  unit: ExerciseUnit
}

export interface AppData {
  schemaVersion: number
  currentPhase: Phase
  sessions: Record<string, SessionRecord>
  prs: Partial<Record<ExerciseId, PRRecord[]>>
}

export interface Snapshot {
  id: string
  timestamp: string
  label: string
  source: "import" | "phase-change" | "manual"
  data: AppData
}

export interface VersionedStore {
  head: string
  snapshots: Snapshot[]
}

export interface PhaseRequirement {
  exerciseId: ExerciseId
  minValue: number
  unit: ExerciseUnit
  description: string
}

export interface PhaseExitCriteria {
  phase: Phase
  requirements: PhaseRequirement[]
  consistencyWeeks: number
  consistencyPercent: number
}

// --- Zod schema for import validation (Zod v3) ---

const PRRecordSchema = z.object({
  date: z.string(),
  value: z.number(),
  unit: z.enum(["reps", "secs"]),
})

const SessionRecordSchema = z.object({
  date: z.string(),
  exercises: z.record(z.array(z.number())).optional(),
  rpe: z.number().min(1).max(10).optional(),
  feeling: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).optional(),
  pain: z.enum(["No", "Rodilla", "Hombro", "Lumbar", "Muñeca", "Otro"]).optional(),
  notes: z.string().optional(),
})

export const AppDataSchema = z.object({
  schemaVersion: z.number(),
  currentPhase: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  sessions: z.record(SessionRecordSchema),
  prs: z.record(z.array(PRRecordSchema)),
})

export type AppDataInput = z.input<typeof AppDataSchema>
export type AppDataOutput = z.output<typeof AppDataSchema>
