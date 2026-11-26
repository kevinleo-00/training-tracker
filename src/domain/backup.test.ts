import { describe, expect, it } from 'vitest';
import { parseAppState, serializeAppState } from './backup';
import { type Action, reduce } from './reducer';
import { day, eid, sid, wid, xid } from './testing';
import { type AppState, emptyState } from './types';

function sample(): AppState {
  const actions: Action[] = [
    { type: 'exercise/create', id: xid('bench'), name: 'Bench press' },
    { type: 'workout/create', id: wid('w1'), date: day('2026-11-20'), name: 'Push day' },
    { type: 'entry/add', workoutId: wid('w1'), entryId: eid('e1'), exerciseId: xid('bench'), setId: sid('s1') },
    { type: 'set/update', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1'), weight: 102.5, reps: 5 },
    { type: 'set/toggleDone', workoutId: wid('w1'), entryId: eid('e1'), setId: sid('s1') },
    { type: 'settings/update', patch: { unit: 'lb' } },
  ];
  return actions.reduce(reduce, emptyState());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests poke at raw JSON
const mutate = (fn: (raw: any) => void) => {
  const raw = JSON.parse(serializeAppState(sample()));
  fn(raw);
  return JSON.stringify(raw);
};

describe('backup', () => {
  it('round-trips a state through JSON', () => {
    const result = parseAppState(serializeAppState(sample()));
    expect(result).toEqual({ ok: true, state: sample() });
  });

  it('accepts an empty state', () => {
    expect(parseAppState(serializeAppState(emptyState()))).toEqual({ ok: true, state: emptyState() });
  });

  it.each([
    ['not JSON', '{"version": 1,'],
    ['not an object', '[1,2,3]'],
    ['an unknown version', mutate((r) => (r.version = 2))],
    ['a workout with a bad date', mutate((r) => (r.workouts.w1.date = '2026-13-01'))],
    ['a workout keyed by another id', mutate((r) => (r.workouts.w1.id = 'w2'))],
    ['a negative weight', mutate((r) => (r.workouts.w1.entries[0].sets[0].weight = -5))],
    ['fractional reps', mutate((r) => (r.workouts.w1.entries[0].sets[0].reps = 2.5))],
    ['a string weight', mutate((r) => (r.workouts.w1.entries[0].sets[0].weight = '100'))],
    ['an entry for an unknown exercise', mutate((r) => (r.workouts.w1.entries[0].exerciseId = 'ghost'))],
    ['a duplicate set id', mutate((r) => r.workouts.w1.entries[0].sets.push(r.workouts.w1.entries[0].sets[0]))],
    ['a bad unit', mutate((r) => (r.settings.unit = 'stone'))],
    ['empty rest presets', mutate((r) => (r.settings.restPresetsSec = []))],
    ['a missing exercises map', mutate((r) => delete r.exercises)],
  ])('rejects %s with a message', (_label, text) => {
    const result = parseAppState(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/\S/);
  });

  it('drops unknown fields instead of carrying them into state', () => {
    const result = parseAppState(mutate((r) => (r.workouts.w1.extra = 'x')));
    expect(result.ok && 'extra' in result.state.workouts[wid('w1')]!).toBe(false);
  });
});
