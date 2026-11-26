import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeAppState } from '../domain/backup';
import { reduce } from '../domain/reducer';
import { day, wid } from '../domain/testing';
import { type AppState, emptyState } from '../domain/types';
import { createStore, type Persistence } from './store';

function memory(initial?: unknown) {
  const saved: AppState[] = [];
  const quarantined: unknown[] = [];
  const persistence: Persistence = {
    load: async () => initial,
    save: async (state) => void saved.push(state),
    quarantine: async (raw) => void quarantined.push(raw),
  };
  return { persistence, saved, quarantined };
}

const create = { type: 'workout/create', id: wid('w1'), date: day('2026-11-25'), name: 'Push' } as const;

describe('store', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts empty when nothing is stored', async () => {
    const store = createStore(memory().persistence);
    expect(await store.load()).toEqual({ notice: null });
    expect(store.getState()).toEqual(emptyState());
  });

  it('restores a stored state', async () => {
    const stored = reduce(emptyState(), create);
    const store = createStore(memory(JSON.parse(serializeAppState(stored))).persistence);
    await store.load();
    expect(store.getState()).toEqual(stored);
  });

  it('keeps unreadable stored data aside instead of overwriting it', async () => {
    const { persistence, quarantined } = memory({ version: 99 });
    const store = createStore(persistence);
    const { notice } = await store.load();
    expect(notice).toMatch(/\S/);
    expect(quarantined).toEqual([{ version: 99 }]);
    expect(store.getState()).toEqual(emptyState());
  });

  it('notifies subscribers and saves the whole document once after a burst of changes', async () => {
    const { persistence, saved } = memory();
    const store = createStore(persistence);
    await store.load();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch(create);
    store.dispatch({ type: 'workout/rename', id: wid('w1'), name: 'Pull' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(saved).toEqual([]);

    await vi.runAllTimersAsync();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.workouts[wid('w1')]!.name).toBe('Pull');
  });

  it('saves within the delay of the first change even while changes keep coming', async () => {
    const { persistence, saved } = memory();
    const store = createStore(persistence, 300);
    await store.load();
    store.dispatch(create);
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(100);
      store.dispatch({ type: 'workout/rename', id: wid('w1'), name: `Push ${i}` });
    }
    // 500ms of steady edits: the first save fired at 300ms instead of waiting for a pause.
    expect(saved.length).toBeGreaterThanOrEqual(1);
    await vi.runAllTimersAsync();
    expect(saved.at(-1)!.workouts[wid('w1')]!.name).toBe('Push 4');
  });

  it('saves immediately on flush', async () => {
    const { persistence, saved } = memory();
    const store = createStore(persistence);
    await store.load();
    store.dispatch(create);
    await store.flush();
    expect(saved).toHaveLength(1);
    await vi.runAllTimersAsync();
    expect(saved).toHaveLength(1);
  });

  it('neither notifies nor saves when an action changes nothing', async () => {
    const { persistence, saved } = memory();
    const store = createStore(persistence);
    await store.load();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'workout/delete', id: wid('missing') });
    await vi.runAllTimersAsync();
    expect(listener).not.toHaveBeenCalled();
    expect(saved).toEqual([]);
  });
});
