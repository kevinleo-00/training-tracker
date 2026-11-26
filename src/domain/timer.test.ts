import { describe, expect, it } from 'vitest';
import { addTime, cancel, IDLE, parseTimer, pause, remainingMs, resume, start, tick, type TimerState } from './timer';

const T0 = 1_000_000;

describe('rest timer', () => {
  it('counts down from endsAt, so time keeps passing while the app sleeps', () => {
    const t = start(90_000, T0);
    expect(t).toEqual({ status: 'running', endsAt: T0 + 90_000, durationMs: 90_000 });
    expect(remainingMs(t, T0 + 30_000)).toBe(60_000);
    expect(remainingMs(t, T0 + 10 * 60_000)).toBe(0);
  });

  it('finishes on the first tick at or after endsAt', () => {
    const t = start(60_000, T0);
    expect(tick(t, T0 + 59_999)).toBe(t);
    expect(tick(t, T0 + 60_000)).toEqual({ status: 'finished' });
    expect(tick(t, T0 + 3_600_000)).toEqual({ status: 'finished' });
  });

  it('pauses and resumes keeping the remaining time', () => {
    const paused = pause(start(60_000, T0), T0 + 20_000);
    expect(paused).toEqual({ status: 'paused', remainingMs: 40_000, durationMs: 60_000 });
    expect(remainingMs(paused, T0 + 999_999)).toBe(40_000);
    expect(tick(paused, T0 + 999_999)).toBe(paused);
    const resumed = resume(paused, T0 + 100_000);
    expect(resumed).toEqual({ status: 'running', endsAt: T0 + 140_000, durationMs: 60_000 });
  });

  it('adds time to a running or paused timer and restarts a finished one', () => {
    expect(addTime(start(60_000, T0), 15_000, T0 + 1)).toEqual({ status: 'running', endsAt: T0 + 75_000, durationMs: 75_000 });
    expect(addTime({ status: 'paused', remainingMs: 5_000, durationMs: 60_000 }, 15_000, T0)).toEqual({
      status: 'paused',
      remainingMs: 20_000,
      durationMs: 75_000,
    });
    expect(addTime({ status: 'finished' }, 15_000, T0)).toEqual(start(15_000, T0));
    expect(addTime(IDLE, 15_000, T0)).toEqual(start(15_000, T0));
  });

  it('only pauses a running timer and cancels to idle', () => {
    const others: TimerState[] = [IDLE, { status: 'paused', remainingMs: 1, durationMs: 2 }, { status: 'finished' }];
    for (const s of others) expect(pause(s, T0)).toBe(s);
    expect(cancel()).toEqual(IDLE);
  });

  it('ignores resume when not paused', () => {
    const running = start(1_000, T0);
    expect(resume(running, T0 + 10)).toBe(running);
    expect(resume(IDLE, T0)).toBe(IDLE);
  });

  it('parses persisted timers and rejects anything else', () => {
    const running = start(60_000, T0);
    expect(parseTimer(JSON.stringify(running))).toEqual(running);
    expect(parseTimer(JSON.stringify({ status: 'paused', remainingMs: 1, durationMs: 2 }))).toEqual({
      status: 'paused',
      remainingMs: 1,
      durationMs: 2,
    });
    expect(parseTimer(JSON.stringify({ status: 'finished' }))).toEqual({ status: 'finished' });
    expect(parseTimer(null)).toEqual(IDLE);
    expect(parseTimer('{nope')).toEqual(IDLE);
    expect(parseTimer(JSON.stringify({ status: 'running', endsAt: 'soon', durationMs: 1 }))).toEqual(IDLE);
    expect(parseTimer(JSON.stringify({ status: 'exploded' }))).toEqual(IDLE);
  });
});
