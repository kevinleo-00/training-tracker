// Builds a realistic AppState through the app's own reducer, dated relative to today.
import { serializeAppState } from '../src/domain/backup';
import { addDays, toLocalDate, weekStart } from '../src/domain/dates';
import { type Action, reduce } from '../src/domain/reducer';
import {
  type AppState,
  emptyState,
  type EntryId,
  type ExerciseId,
  type Language,
  type SetId,
  type ThemeId,
  type WorkoutId,
} from '../src/domain/types';

const plans: { name: string; weekday: number; lifts: [string, number, number, number][] }[] = [
  // [exercise, start weight, weekly increment, reps]
  { name: 'Push day', weekday: 0, lifts: [['Bench press', 70, 2.5, 5], ['Overhead press', 40, 1.25, 6], ['Dips', 10, 1, 8]] },
  { name: 'Pull day', weekday: 2, lifts: [['Deadlift', 120, 5, 3], ['Barbell row', 60, 2.5, 8], ['Pull-up', 0, 0, 8]] },
  { name: 'Leg day', weekday: 4, lifts: [['Squat', 100, 5, 5], ['Romanian deadlift', 80, 2.5, 8]] },
];

export function fixtureState(weeks = 8, theme: ThemeId = 'classic', language: Language = 'system'): AppState {
  const today = toLocalDate(new Date());
  const thisWeek = weekStart(today);
  const actions: Action[] = [{ type: 'settings/update', patch: { theme, language } }];
  const ids = new Map<string, ExerciseId>();
  for (const plan of plans) {
    for (const [name] of plan.lifts) {
      const id = `x-${name.toLowerCase().replace(/\W+/g, '-')}` as ExerciseId;
      ids.set(name, id);
      actions.push({ type: 'exercise/create', id, name });
    }
  }
  for (let week = weeks - 1; week >= 0; week--) {
    if (week === 3) continue; // a missed week, so the streak is not the whole history
    for (const plan of plans) {
      const date = addDays(addDays(thisWeek, -7 * week), plan.weekday);
      if (date > today) continue;
      const wid = `w-${date}` as WorkoutId;
      actions.push({ type: 'workout/create', id: wid, date, name: plan.name });
      plan.lifts.forEach(([name, start, step, reps], i) => {
        const entryId = `${wid}-e${i}` as EntryId;
        const weight = start + step * (weeks - 1 - week);
        actions.push({ type: 'entry/add', workoutId: wid, entryId, exerciseId: ids.get(name)!, setId: `${entryId}-s0` as SetId });
        const ref = { workoutId: wid, entryId };
        actions.push({ type: 'set/update', ...ref, setId: `${entryId}-s0` as SetId, weight, reps });
        for (let s = 1; s < 3; s++) actions.push({ type: 'set/add', ...ref, setId: `${entryId}-s${s}` as SetId });
        for (let s = 0; s < 3; s++) actions.push({ type: 'set/toggleDone', ...ref, setId: `${entryId}-s${s}` as SetId });
      });
    }
  }
  return actions.reduce(reduce, emptyState());
}

export const fixtureJson = (theme?: ThemeId, language?: Language) => serializeAppState(fixtureState(8, theme, language));
