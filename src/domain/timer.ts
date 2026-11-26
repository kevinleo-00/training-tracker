export type TimerState =
  | { status: 'idle' }
  | { status: 'running'; endsAt: number; durationMs: number }
  | { status: 'paused'; remainingMs: number; durationMs: number }
  | { status: 'finished' };

export const IDLE: TimerState = { status: 'idle' };

export function start(durationMs: number, now: number): TimerState {
  return { status: 'running', endsAt: now + durationMs, durationMs };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { status: 'paused', remainingMs: Math.max(0, state.endsAt - now), durationMs: state.durationMs };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state;
  return { status: 'running', endsAt: now + state.remainingMs, durationMs: state.durationMs };
}

export function addTime(state: TimerState, ms: number, now: number): TimerState {
  switch (state.status) {
    case 'running':
      return { ...state, endsAt: state.endsAt + ms, durationMs: state.durationMs + ms };
    case 'paused':
      return { ...state, remainingMs: state.remainingMs + ms, durationMs: state.durationMs + ms };
    case 'idle':
    case 'finished':
      return start(ms, now);
  }
}

export function cancel(): TimerState {
  return IDLE;
}

/** Moves a running timer to finished once `now` reaches its end. */
export function tick(state: TimerState, now: number): TimerState {
  return state.status === 'running' && now >= state.endsAt ? { status: 'finished' } : state;
}

export function remainingMs(state: TimerState, now: number): number {
  switch (state.status) {
    case 'running':
      return Math.max(0, state.endsAt - now);
    case 'paused':
      return state.remainingMs;
    case 'idle':
    case 'finished':
      return 0;
  }
}

const isMs = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Parses a timer persisted as JSON. Anything unreadable becomes idle. */
export function parseTimer(text: string | null): TimerState {
  if (text === null) return IDLE;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return IDLE;
  }
  if (typeof raw !== 'object' || raw === null) return IDLE;
  const r = raw as Record<string, unknown>;
  if (r.status === 'running' && isMs(r.endsAt) && isMs(r.durationMs)) {
    return { status: 'running', endsAt: r.endsAt, durationMs: r.durationMs };
  }
  if (r.status === 'paused' && isMs(r.remainingMs) && isMs(r.durationMs)) {
    return { status: 'paused', remainingMs: r.remainingMs, durationMs: r.durationMs };
  }
  if (r.status === 'finished') return { status: 'finished' };
  return IDLE;
}
