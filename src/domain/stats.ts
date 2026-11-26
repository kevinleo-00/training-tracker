import { addDays, daysBetween, weekStart } from './dates';
import type { AppState, Exercise, ExerciseId, LocalDate, Workout, WorkSet } from './types';

/** Epley estimate. A single is its own 1RM; a set without reps estimates nothing. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface ProgressPoint {
  date: LocalDate;
  maxWeight: number;
  bestE1RM: number;
}

export interface SetRecord {
  weight: number;
  reps: number;
  date: LocalDate;
  e1rm: number;
}

export interface WeekSummary {
  weekStart: LocalDate;
  workouts: number;
  volume: number;
}

export interface TrainingCounts {
  thisWeek: number;
  last30Days: number;
  weeklyStreak: number;
}

function* doneSets(workout: Workout, exerciseId?: ExerciseId): Generator<WorkSet> {
  for (const entry of workout.entries) {
    if (exerciseId !== undefined && entry.exerciseId !== exerciseId) continue;
    for (const set of entry.sets) if (set.done) yield set;
  }
}

const isTrained = (w: Workout) => !doneSets(w).next().done;
const trainedWorkouts = (state: AppState) => Object.values(state.workouts).filter(isTrained);

function* doneSetRecords(state: AppState, exerciseId: ExerciseId): Generator<SetRecord> {
  for (const w of Object.values(state.workouts)) {
    for (const s of doneSets(w, exerciseId)) {
      yield { weight: s.weight, reps: s.reps, date: w.date, e1rm: estimate1RM(s.weight, s.reps) };
    }
  }
}

/** Max weight and best estimated 1RM per training date, oldest first. */
export function exerciseProgress(state: AppState, exerciseId: ExerciseId): ProgressPoint[] {
  const byDate = new Map<LocalDate, ProgressPoint>();
  for (const r of doneSetRecords(state, exerciseId)) {
    const p = byDate.get(r.date) ?? { date: r.date, maxWeight: 0, bestE1RM: 0 };
    byDate.set(r.date, { date: r.date, maxWeight: Math.max(p.maxWeight, r.weight), bestE1RM: Math.max(p.bestE1RM, r.e1rm) });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function personalRecords(state: AppState, exerciseId: ExerciseId): { heaviest: SetRecord | null; bestE1RM: SetRecord | null } {
  let heaviest: SetRecord | null = null;
  let bestE1RM: SetRecord | null = null;
  for (const r of doneSetRecords(state, exerciseId)) {
    if (!heaviest || r.weight > heaviest.weight || (r.weight === heaviest.weight && r.reps > heaviest.reps)) heaviest = r;
    if (!bestE1RM || r.e1rm > bestE1RM.e1rm) bestE1RM = r;
  }
  return { heaviest, bestE1RM };
}

/** Workouts trained and volume (weight x reps of done sets) for the last `weeks` Monday-based weeks, oldest first. */
export function weeklySummary(state: AppState, today: LocalDate, weeks = 12): WeekSummary[] {
  const current = weekStart(today);
  const summary = Array.from({ length: weeks }, (_, i) => ({
    weekStart: addDays(current, (i - weeks + 1) * 7),
    workouts: 0,
    volume: 0,
  }));
  for (const w of trainedWorkouts(state)) {
    const index = weeks - 1 - daysBetween(weekStart(w.date), current) / 7;
    const bucket = summary[index];
    if (!bucket) continue;
    bucket.workouts += 1;
    for (const s of doneSets(w)) bucket.volume += s.weight * s.reps;
  }
  return summary;
}

export function trainingCounts(state: AppState, today: LocalDate): TrainingCounts {
  const current = weekStart(today);
  const trainedWeeks = new Set<LocalDate>();
  let thisWeek = 0;
  let last30Days = 0;
  for (const w of trainedWorkouts(state)) {
    const age = daysBetween(w.date, today);
    if (age < 0) continue;
    trainedWeeks.add(weekStart(w.date));
    if (weekStart(w.date) === current) thisWeek += 1;
    if (age < 30) last30Days += 1;
  }
  // A week still in progress does not break the streak until it ends empty.
  let week = trainedWeeks.has(current) ? current : addDays(current, -7);
  let weeklyStreak = 0;
  while (trainedWeeks.has(week)) {
    weeklyStreak += 1;
    week = addDays(week, -7);
  }
  return { thisWeek, last30Days, weeklyStreak };
}

/** Exercises with at least one done set, most recently trained first. */
export function trainedExercises(state: AppState): Exercise[] {
  const lastDate = new Map<ExerciseId, LocalDate>();
  for (const w of Object.values(state.workouts)) {
    for (const entry of w.entries) {
      if (!entry.sets.some((s) => s.done)) continue;
      const seen = lastDate.get(entry.exerciseId);
      if (!seen || w.date > seen) lastDate.set(entry.exerciseId, w.date);
    }
  }
  return [...lastDate]
    .sort(([, a], [, b]) => (a < b ? 1 : a > b ? -1 : 0))
    .flatMap(([id]) => state.exercises[id] ?? []);
}
