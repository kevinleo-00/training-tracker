import type { AppState, Workout } from '../domain/types';

/** Newest first; same-day workouts keep a stable order. */
export function sortedWorkouts(state: AppState): Workout[] {
  return Object.values(state.workouts).sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1));
}

export function workoutSummary(w: Workout): string {
  const sets = w.entries.flatMap((e) => e.sets);
  const done = sets.filter((s) => s.done).length;
  const exercises = `${w.entries.length} exercise${w.entries.length === 1 ? '' : 's'}`;
  return sets.length === 0 ? exercises : `${exercises} · ${done}/${sets.length} sets done`;
}
