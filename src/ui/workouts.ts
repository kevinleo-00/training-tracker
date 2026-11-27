import type { AppState, Workout } from '../domain/types';
import type { Messages } from './i18n';

/** Newest first; same-day workouts keep a stable order. */
export function sortedWorkouts(state: AppState): Workout[] {
  return Object.values(state.workouts).sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
}

export function workoutSummary(w: Workout, t: Messages): string {
  const sets = w.entries.flatMap((e) => e.sets);
  return t.workouts.summary(w.entries.length, sets.filter((s) => s.done).length, sets.length);
}
