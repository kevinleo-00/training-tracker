import { describe, expect, it } from 'vitest';
import { type Action, reduce } from './reducer';
import { day, eid, sid, wid, xid } from './testing';
import { type AppState, emptyState } from './types';

const run = (...actions: Action[]) => actions.reduce(reduce, emptyState());

const bench = xid('bench');
const squat = xid('squat');

/** A workout on 2026-11-20 with bench: 2 sets (100x5 done, 100x5 planned). */
function seeded(): AppState {
  return run(
    { type: 'exercise/create', id: bench, name: 'Bench press' },
    { type: 'exercise/create', id: squat, name: 'Squat' },
    { type: 'workout/create', id: wid('w1'), date: day('2026-11-20'), name: 'Push day' },
    { type: 'entry/add', workoutId: wid('w1'), entryId: eid('e1'), exerciseId: bench, setId: sid('s1') },
    { type: 'set/update', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1'), weight: 100, reps: 5 },
    { type: 'set/add', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s2') },
    { type: 'set/toggleDone', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1') },
  );
}

const entry = (s: AppState, w = 'w1', i = 0) => s.workouts[wid(w)]!.entries[i]!;

describe('reduce', () => {
  it('creates a blank workout', () => {
    const s = run({ type: 'workout/create', id: wid('w1'), date: day('2026-11-25'), name: 'Legs' });
    expect(s.workouts[wid('w1')]).toEqual({ id: 'w1', date: '2026-11-25', name: 'Legs', entries: [] });
  });

  it('renames, redates, and deletes a workout', () => {
    let s = seeded();
    s = reduce(s, { type: 'workout/rename', id: wid('w1'), name: 'Chest' });
    s = reduce(s, { type: 'workout/redate', id: wid('w1'), date: day('2026-11-21') });
    expect(s.workouts[wid('w1')]).toMatchObject({ name: 'Chest', date: '2026-11-21' });
    s = reduce(s, { type: 'workout/delete', id: wid('w1') });
    expect(s.workouts).toEqual({});
  });

  it('adds an entry with one set and appends a set copying the previous set', () => {
    const s = seeded();
    expect(entry(s)).toEqual({
      id: 'e1',
      exerciseId: 'bench',
      sets: [
        { id: 's1', weight: 100, reps: 5, done: true },
        { id: 's2', weight: 100, reps: 5, done: false },
      ],
    });
  });

  it('prefills a new entry from the last set logged for that exercise in an earlier workout', () => {
    let s = seeded();
    s = reduce(s, { type: 'workout/create', id: wid('w2'), date: day('2026-11-25'), name: 'Push' });
    s = reduce(s, { type: 'entry/add', workoutId: wid('w2'), entryId: eid('e2'), exerciseId: bench, setId: sid('s9') });
    expect(entry(s, 'w2').sets).toEqual([{ id: 's9', weight: 100, reps: 5, done: false }]);

    s = reduce(s, { type: 'entry/add', workoutId: wid('w2'), entryId: eid('e3'), exerciseId: squat, setId: sid('s10') });
    expect(entry(s, 'w2', 1).sets).toEqual([{ id: 's10', weight: 0, reps: 0, done: false }]);
  });

  it('copies a workout as an un-done plan with fresh ids', () => {
    let s = seeded();
    s = reduce(s, { type: 'workout/copy', id: wid('w2'), sourceId: wid('w1'), date: day('2026-11-27') });
    const copy = s.workouts[wid('w2')]!;
    expect(copy.name).toBe('Push day');
    expect(copy.date).toBe('2026-11-27');
    expect(copy.entries).toHaveLength(1);
    expect(copy.entries[0]!.exerciseId).toBe('bench');
    expect(copy.entries[0]!.sets.map((x) => [x.weight, x.reps, x.done])).toEqual([
      [100, 5, false],
      [100, 5, false],
    ]);
    const ids = [copy.entries[0]!.id, ...copy.entries[0]!.sets.map((x) => x.id)];
    const sourceIds = [entry(s).id, ...entry(s).sets.map((x) => x.id)];
    expect(new Set([...ids, ...sourceIds]).size).toBe(ids.length + sourceIds.length);
    // The source is untouched.
    expect(entry(s).sets[0]!.done).toBe(true);
  });

  it('is deterministic for the same actions', () => {
    const copy: Action = { type: 'workout/copy', id: wid('w2'), sourceId: wid('w1'), date: day('2026-11-27') };
    expect(reduce(seeded(), copy)).toEqual(reduce(seeded(), copy));
  });

  it('removes and reorders entries', () => {
    let s = seeded();
    s = reduce(s, { type: 'entry/add', workoutId: wid('w1'), entryId: eid('e2'), exerciseId: squat, setId: sid('s3') });
    s = reduce(s, { type: 'entry/move', workoutId: wid('w1'), entryId: eid('e2'), toIndex: 0 });
    expect(s.workouts[wid('w1')]!.entries.map((e) => e.id)).toEqual(['e2', 'e1']);
    s = reduce(s, { type: 'entry/move', workoutId: wid('w1'), entryId: eid('e2'), toIndex: 99 });
    expect(s.workouts[wid('w1')]!.entries.map((e) => e.id)).toEqual(['e1', 'e2']);
    s = reduce(s, { type: 'entry/remove', workoutId: wid('w1'), entryId: eid('e1') });
    expect(s.workouts[wid('w1')]!.entries.map((e) => e.id)).toEqual(['e2']);
  });

  it('updates, toggles, and removes sets', () => {
    let s = seeded();
    s = reduce(s, { type: 'set/update', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s2'), reps: 3 });
    s = reduce(s, { type: 'set/toggleDone', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1') });
    expect(entry(s).sets.map((x) => [x.weight, x.reps, x.done])).toEqual([
      [100, 5, false],
      [100, 3, false],
    ]);
    s = reduce(s, { type: 'set/remove', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1') });
    expect(entry(s).sets.map((x) => x.id)).toEqual(['s2']);
  });

  it('adds a set to an empty entry with zero values', () => {
    let s = seeded();
    s = reduce(s, { type: 'set/remove', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1') });
    s = reduce(s, { type: 'set/remove', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s2') });
    s = reduce(s, { type: 'set/add', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s3') });
    expect(entry(s).sets).toEqual([{ id: 's3', weight: 0, reps: 0, done: false }]);
  });

  it('creates and renames exercises', () => {
    let s = run({ type: 'exercise/create', id: bench, name: 'Bench' });
    s = reduce(s, { type: 'exercise/rename', id: bench, name: 'Bench press' });
    expect(s.exercises[bench]).toEqual({ id: 'bench', name: 'Bench press' });
  });

  it('merges a settings patch', () => {
    const s = run({ type: 'settings/update', patch: { unit: 'lb', lastRestSec: 120 } });
    expect(s.settings).toEqual({ unit: 'lb', restPresetsSec: [60, 90, 120, 180], autoStartRest: true, lastRestSec: 120 });
  });

  it('replaces the whole state', () => {
    const next = seeded();
    expect(reduce(emptyState(), { type: 'state/replace', state: next })).toBe(next);
  });

  it('ignores actions that target missing records', () => {
    const s = seeded();
    const missing: Action[] = [
      { type: 'workout/rename', id: wid('nope'), name: 'x' },
      { type: 'workout/copy', id: wid('w9'), sourceId: wid('nope'), date: day('2026-11-27') },
      { type: 'entry/add', workoutId: wid('nope'), entryId: eid('e9'), exerciseId: bench, setId: sid('s9') },
      { type: 'entry/add', workoutId: wid('w1'), entryId: eid('e9'), exerciseId: xid('nope'), setId: sid('s9') },
      { type: 'set/toggleDone', workoutId: wid('w1'), entryId: eid('nope'), setId: sid('s1') },
      { type: 'exercise/rename', id: xid('nope'), name: 'x' },
    ];
    for (const action of missing) expect(reduce(s, action)).toBe(s);
  });

  it('never mutates the previous state', () => {
    const s = seeded();
    const snapshot = structuredClone(s);
    reduce(s, { type: 'set/toggleDone', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s2') });
    reduce(s, { type: 'entry/remove', workoutId: wid('w1'), entryId: eid('e1') });
    reduce(s, { type: 'workout/delete', id: wid('w1') });
    expect(s).toEqual(snapshot);
  });
});
