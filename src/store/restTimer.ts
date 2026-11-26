import { useSyncExternalStore } from 'react';
import * as machine from '../domain/timer';
import type { TimerState } from '../domain/timer';

const KEY = 'rest-timer';

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(state: TimerState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the timer still works in memory.
  }
}

let state = machine.restore(machine.parseTimer(read()), Date.now());
const listeners = new Set<() => void>();

function set(next: TimerState) {
  if (next === state) return;
  state = next;
  write(next);
  for (const listener of listeners) listener();
}

/** The app's single rest timer: the pure machine plus a clock and localStorage. */
export const restTimer = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  start: (seconds: number) => set(machine.start(seconds * 1000, Date.now())),
  addTime: (ms: number) => set(machine.addTime(state, ms, Date.now())),
  pause: () => set(machine.pause(state, Date.now())),
  resume: () => set(machine.resume(state, Date.now())),
  cancel: () => set(machine.cancel()),
  /** Returns true when this tick finished the timer. */
  tick(): boolean {
    const before = state;
    set(machine.tick(state, Date.now()));
    return state !== before;
  },
};

export function useRestTimer(): TimerState {
  return useSyncExternalStore(restTimer.subscribe, restTimer.getState);
}
