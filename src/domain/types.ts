type Brand<T, B> = T & { readonly __brand: B };
export type ExerciseId = Brand<string, 'ExerciseId'>;
export type WorkoutId = Brand<string, 'WorkoutId'>;
export type EntryId = Brand<string, 'EntryId'>; // exercise-within-workout
export type SetId = Brand<string, 'SetId'>;
export type LocalDate = Brand<string, 'LocalDate'>; // 'YYYY-MM-DD', local time

export interface Exercise {
  id: ExerciseId;
  name: string;
}
export interface WorkSet {
  id: SetId;
  weight: number;
  reps: number;
  done: boolean;
}
export interface WorkoutEntry {
  id: EntryId;
  exerciseId: ExerciseId;
  sets: WorkSet[];
}
export interface Workout {
  id: WorkoutId;
  date: LocalDate;
  name: string;
  entries: WorkoutEntry[];
}
export interface Settings {
  unit: 'kg' | 'lb';
  restPresetsSec: number[];
  autoStartRest: boolean;
  lastRestSec: number;
}
export interface AppState {
  version: 1;
  exercises: Record<ExerciseId, Exercise>;
  workouts: Record<WorkoutId, Workout>;
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  restPresetsSec: [60, 90, 120, 180],
  autoStartRest: true,
  lastRestSec: 90,
};

export function emptyState(): AppState {
  return { version: 1, exercises: {}, workouts: {}, settings: { ...DEFAULT_SETTINGS } };
}
