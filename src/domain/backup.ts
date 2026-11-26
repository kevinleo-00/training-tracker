import { parseLocalDate } from './dates';
import type { AppState, EntryId, Exercise, ExerciseId, SetId, Settings, Workout, WorkoutEntry, WorkoutId, WorkSet } from './types';

export type ParseResult = { ok: true; state: AppState } | { ok: false; error: string };

class Invalid extends Error {}

export function serializeAppState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseAppState(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  return validateAppState(raw);
}

/** Checks untrusted data (a backup file, a stored document) and rebuilds it as an AppState. */
export function validateAppState(raw: unknown): ParseResult {
  try {
    return { ok: true, state: appState(raw) };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `Not a valid backup: ${e.message}` };
    throw e;
  }
}

function fail(path: string, expected: string): never {
  throw new Invalid(`${path} should be ${expected}.`);
}

function record(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'an object');
  return v as Record<string, unknown>;
}

function list(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path, 'a list');
  return v;
}

function text(v: unknown, path: string): string {
  if (typeof v !== 'string') fail(path, 'text');
  return v;
}

function nonNegative(v: unknown, path: string, integer = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || (integer && !Number.isInteger(v))) {
    fail(path, integer ? 'a whole number of 0 or more' : 'a number of 0 or more');
  }
  return v;
}

function appState(raw: unknown): AppState {
  const r = record(raw, 'The file');
  if (r.version !== 1) fail('version', '1');

  const exercises: Record<ExerciseId, Exercise> = {};
  for (const [key, value] of Object.entries(record(r.exercises, 'exercises'))) {
    const path = `exercises.${key}`;
    const x = record(value, path);
    if (x.id !== key) fail(`${path}.id`, `"${key}"`);
    exercises[key as ExerciseId] = { id: key as ExerciseId, name: text(x.name, `${path}.name`) };
  }

  const seen = new Set<string>();
  const unique = <T extends string>(id: unknown, path: string): T => {
    const s = text(id, path);
    if (seen.has(s)) fail(path, 'unique');
    seen.add(s);
    return s as T;
  };

  const workouts: Record<WorkoutId, Workout> = {};
  for (const [key, value] of Object.entries(record(r.workouts, 'workouts'))) {
    const path = `workouts.${key}`;
    const w = record(value, path);
    if (w.id !== key) fail(`${path}.id`, `"${key}"`);
    const date = parseLocalDate(w.date) ?? fail(`${path}.date`, 'a date like 2026-01-31');
    const entries = list(w.entries, `${path}.entries`).map((ev, i): WorkoutEntry => {
      const ep = `${path}.entries[${i}]`;
      const e = record(ev, ep);
      const exerciseId = text(e.exerciseId, `${ep}.exerciseId`) as ExerciseId;
      if (!exercises[exerciseId]) fail(`${ep}.exerciseId`, 'a known exercise');
      const sets = list(e.sets, `${ep}.sets`).map((sv, j): WorkSet => {
        const sp = `${ep}.sets[${j}]`;
        const s = record(sv, sp);
        if (typeof s.done !== 'boolean') fail(`${sp}.done`, 'true or false');
        return {
          id: unique<SetId>(s.id, `${sp}.id`),
          weight: nonNegative(s.weight, `${sp}.weight`),
          reps: nonNegative(s.reps, `${sp}.reps`, true),
          done: s.done,
        };
      });
      return { id: unique<EntryId>(e.id, `${ep}.id`), exerciseId, sets };
    });
    workouts[key as WorkoutId] = { id: key as WorkoutId, date, name: text(w.name, `${path}.name`), entries };
  }

  return { version: 1, exercises, workouts, settings: settings(r.settings) };
}

function settings(raw: unknown): Settings {
  const s = record(raw, 'settings');
  if (s.unit !== 'kg' && s.unit !== 'lb') fail('settings.unit', '"kg" or "lb"');
  const presets = list(s.restPresetsSec, 'settings.restPresetsSec').map((v, i) =>
    nonNegative(v, `settings.restPresetsSec[${i}]`, true),
  );
  if (presets.length === 0) fail('settings.restPresetsSec', 'a non-empty list');
  if (typeof s.autoStartRest !== 'boolean') fail('settings.autoStartRest', 'true or false');
  return {
    unit: s.unit,
    restPresetsSec: presets,
    autoStartRest: s.autoStartRest,
    lastRestSec: nonNegative(s.lastRestSec, 'settings.lastRestSec', true),
  };
}
