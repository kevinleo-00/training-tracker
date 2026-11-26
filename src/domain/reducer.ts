import type {
  AppState,
  EntryId,
  ExerciseId,
  LocalDate,
  SetId,
  Settings,
  Workout,
  WorkoutEntry,
  WorkoutId,
  WorkSet,
} from './types';

type SetRef = { workoutId: WorkoutId; entryId: EntryId; setId: SetId };

export type Action =
  | { type: 'workout/create'; id: WorkoutId; date: LocalDate; name: string }
  | { type: 'workout/copy'; id: WorkoutId; sourceId: WorkoutId; date: LocalDate }
  | { type: 'workout/rename'; id: WorkoutId; name: string }
  | { type: 'workout/redate'; id: WorkoutId; date: LocalDate }
  | { type: 'workout/delete'; id: WorkoutId }
  | { type: 'entry/add'; workoutId: WorkoutId; entryId: EntryId; exerciseId: ExerciseId; setId: SetId }
  | { type: 'entry/remove'; workoutId: WorkoutId; entryId: EntryId }
  | { type: 'entry/move'; workoutId: WorkoutId; entryId: EntryId; toIndex: number }
  | ({ type: 'set/add' } & SetRef)
  | ({ type: 'set/update'; weight?: number; reps?: number } & SetRef)
  | ({ type: 'set/toggleDone' } & SetRef)
  | ({ type: 'set/remove' } & SetRef)
  | { type: 'exercise/create'; id: ExerciseId; name: string }
  | { type: 'exercise/rename'; id: ExerciseId; name: string }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'state/replace'; state: AppState };

/**
 * The only way app state changes. Pure and deterministic: ids and dates arrive
 * in the action. Actions that target a missing record return `state` as is.
 */
export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'workout/create':
      return putWorkout(state, { id: action.id, date: action.date, name: action.name, entries: [] });

    case 'workout/copy': {
      const source = state.workouts[action.sourceId];
      if (!source) return state;
      // Child ids derive from the new workout id, so the copy needs no id list.
      const entries = source.entries.map((entry, i): WorkoutEntry => {
        const entryId = `${action.id}.e${i}` as EntryId;
        return {
          id: entryId,
          exerciseId: entry.exerciseId,
          sets: entry.sets.map((set, j) => ({
            id: `${entryId}.s${j}` as SetId,
            weight: set.weight,
            reps: set.reps,
            done: false,
          })),
        };
      });
      return putWorkout(state, { id: action.id, date: action.date, name: source.name, entries });
    }

    case 'workout/rename':
      return updateWorkout(state, action.id, (w) => ({ ...w, name: action.name }));

    case 'workout/redate':
      return updateWorkout(state, action.id, (w) => ({ ...w, date: action.date }));

    case 'workout/delete': {
      if (!state.workouts[action.id]) return state;
      const workouts = { ...state.workouts };
      delete workouts[action.id];
      return { ...state, workouts };
    }

    case 'entry/add': {
      if (!state.exercises[action.exerciseId]) return state;
      return updateWorkout(state, action.workoutId, (w) => {
        const last = lastLoggedSet(state, action.exerciseId, w);
        const set: WorkSet = { id: action.setId, weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false };
        return { ...w, entries: [...w.entries, { id: action.entryId, exerciseId: action.exerciseId, sets: [set] }] };
      });
    }

    case 'entry/remove':
      return updateWorkout(state, action.workoutId, (w) => {
        const entries = w.entries.filter((e) => e.id !== action.entryId);
        return entries.length === w.entries.length ? w : { ...w, entries };
      });

    case 'entry/move':
      return updateWorkout(state, action.workoutId, (w) => {
        const from = w.entries.findIndex((e) => e.id === action.entryId);
        if (from < 0) return w;
        const entries = [...w.entries];
        const [moved] = entries.splice(from, 1);
        entries.splice(Math.max(0, Math.min(action.toIndex, entries.length)), 0, moved!);
        return { ...w, entries };
      });

    case 'set/add':
      return updateEntry(state, action, (entry) => {
        const prev = entry.sets.at(-1);
        const set: WorkSet = { id: action.setId, weight: prev?.weight ?? 0, reps: prev?.reps ?? 0, done: false };
        return { ...entry, sets: [...entry.sets, set] };
      });

    case 'set/update':
      return updateSet(state, action, (set) => ({
        ...set,
        weight: action.weight ?? set.weight,
        reps: action.reps ?? set.reps,
      }));

    case 'set/toggleDone':
      return updateSet(state, action, (set) => ({ ...set, done: !set.done }));

    case 'set/remove':
      return updateEntry(state, action, (entry) => {
        const sets = entry.sets.filter((s) => s.id !== action.setId);
        return sets.length === entry.sets.length ? entry : { ...entry, sets };
      });

    case 'exercise/create':
      return { ...state, exercises: { ...state.exercises, [action.id]: { id: action.id, name: action.name } } };

    case 'exercise/rename': {
      const exercise = state.exercises[action.id];
      if (!exercise) return state;
      return { ...state, exercises: { ...state.exercises, [action.id]: { ...exercise, name: action.name } } };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'state/replace':
      return action.state;
  }
}

function putWorkout(state: AppState, workout: Workout): AppState {
  return { ...state, workouts: { ...state.workouts, [workout.id]: workout } };
}

function updateWorkout(state: AppState, id: WorkoutId, fn: (w: Workout) => Workout): AppState {
  const workout = state.workouts[id];
  if (!workout) return state;
  const next = fn(workout);
  return next === workout ? state : putWorkout(state, next);
}

function updateEntry(
  state: AppState,
  ref: { workoutId: WorkoutId; entryId: EntryId },
  fn: (e: WorkoutEntry) => WorkoutEntry,
): AppState {
  return updateWorkout(state, ref.workoutId, (w) => {
    const index = w.entries.findIndex((e) => e.id === ref.entryId);
    if (index < 0) return w;
    const next = fn(w.entries[index]!);
    if (next === w.entries[index]) return w;
    return { ...w, entries: w.entries.with(index, next) };
  });
}

function updateSet(state: AppState, ref: SetRef, fn: (s: WorkSet) => WorkSet): AppState {
  return updateEntry(state, ref, (entry) => {
    const index = entry.sets.findIndex((s) => s.id === ref.setId);
    if (index < 0) return entry;
    return { ...entry, sets: entry.sets.with(index, fn(entry.sets[index]!)) };
  });
}

/** The last set of `exerciseId` in the most recent other workout dated on or before `target`. */
function lastLoggedSet(state: AppState, exerciseId: ExerciseId, target: Workout): WorkSet | undefined {
  let best: { date: LocalDate; set: WorkSet } | undefined;
  for (const w of Object.values(state.workouts)) {
    if (w.id === target.id || w.date > target.date || (best && w.date <= best.date)) continue;
    const set = w.entries.findLast((e) => e.exerciseId === exerciseId && e.sets.length > 0)?.sets.at(-1);
    if (set) best = { date: w.date, set };
  }
  return best?.set;
}
