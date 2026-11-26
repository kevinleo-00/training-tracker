import { describe, expect, it } from 'vitest';
import {
  estimate1RM,
  exerciseProgress,
  personalRecords,
  trainedExercises,
  trainingCounts,
  weeklySummary,
} from './stats';
import { day, eid, sid, wid, xid } from './testing';
import type { AppState, Workout, WorkSet } from './types';
import { emptyState } from './types';

const bench = xid('bench');
const squat = xid('squat');
let n = 0;
const set = (weight: number, reps: number, done = true): WorkSet => ({ id: sid(`s${n++}`), weight, reps, done });

function workout(id: string, date: string, entries: Record<string, WorkSet[]>): Workout {
  return {
    id: wid(id),
    date: day(date),
    name: id,
    entries: Object.entries(entries).map(([exerciseId, sets], i) => ({
      id: eid(`${id}-e${i}`),
      exerciseId: xid(exerciseId),
      sets,
    })),
  };
}

function state(...workouts: Workout[]): AppState {
  const s = emptyState();
  s.exercises[bench] = { id: bench, name: 'Bench press' };
  s.exercises[squat] = { id: squat, name: 'Squat' };
  for (const w of workouts) s.workouts[w.id] = w;
  return s;
}

describe('estimate1RM', () => {
  it('applies Epley', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.667, 3);
    expect(estimate1RM(60, 10)).toBeCloseTo(80, 6);
  });
  it('treats a single as the 1RM itself', () => {
    expect(estimate1RM(140, 1)).toBe(140);
  });
  it('is zero for a set with no reps', () => {
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe('exerciseProgress', () => {
  it('returns one point per date from done sets only, oldest first', () => {
    const s = state(
      workout('b', '2026-11-10', { bench: [set(105, 3), set(120, 1, false)] }),
      workout('a', '2026-11-03', { bench: [set(100, 5), set(90, 10)], squat: [set(150, 5)] }),
      workout('c', '2026-11-17', { bench: [set(110, 2, false)] }),
    );
    const points = exerciseProgress(s, bench);
    expect(points.map((p) => p.date)).toEqual(['2026-11-03', '2026-11-10']);
    expect(points[0]!.maxWeight).toBe(100);
    expect(points[0]!.bestE1RM).toBeCloseTo(120, 6); // 90x10 beats 100x5 (116.7)
    expect(points[1]!.maxWeight).toBe(105);
    expect(points[1]!.bestE1RM).toBeCloseTo(115.5, 6);
  });

  it('merges two workouts on the same date', () => {
    const s = state(
      workout('a', '2026-11-03', { bench: [set(100, 5)] }),
      workout('b', '2026-11-03', { bench: [set(102.5, 5)] }),
    );
    expect(exerciseProgress(s, bench)).toHaveLength(1);
    expect(exerciseProgress(s, bench)[0]!.maxWeight).toBe(102.5);
  });
});

describe('personalRecords', () => {
  it('finds the heaviest set (more reps breaks ties) and the best estimated 1RM set', () => {
    const s = state(
      workout('a', '2026-11-03', { bench: [set(100, 3), set(90, 10)] }),
      workout('b', '2026-11-10', { bench: [set(100, 4), set(130, 1, false)] }),
    );
    const pr = personalRecords(s, bench);
    expect(pr.heaviest).toMatchObject({ weight: 100, reps: 4, date: '2026-11-10' });
    expect(pr.bestE1RM).toMatchObject({ weight: 90, reps: 10, date: '2026-11-03' });
    expect(pr.bestE1RM!.e1rm).toBeCloseTo(120, 6);
  });

  it('is empty for an exercise with no done sets', () => {
    expect(personalRecords(state(), bench)).toEqual({ heaviest: null, bestE1RM: null });
  });
});

describe('weeklySummary', () => {
  it('buckets the last N Monday-based weeks, oldest first, counting only done sets', () => {
    const s = state(
      workout('a', '2026-11-23', { bench: [set(100, 5), set(100, 5, false)] }), // this week (Mon)
      workout('b', '2026-11-25', { squat: [set(100, 10)] }), // this week (Wed)
      workout('c', '2026-11-22', { bench: [set(50, 10)] }), // last week (Sun)
      workout('d', '2026-11-18', { bench: [set(60, 5, false)] }), // planned only: not a workout
      workout('e', '2026-08-01', { bench: [set(60, 5)] }), // outside 3 weeks
    );
    expect(weeklySummary(s, day('2026-11-25'), 3)).toEqual([
      { weekStart: '2026-11-09', workouts: 0, volume: 0 },
      { weekStart: '2026-11-16', workouts: 1, volume: 500 },
      { weekStart: '2026-11-23', workouts: 2, volume: 1500 },
    ]);
  });

  it('defaults to 12 weeks', () => {
    expect(weeklySummary(state(), day('2026-11-25'))).toHaveLength(12);
  });
});

describe('trainingCounts', () => {
  const today = day('2026-11-25'); // Wednesday

  it('counts this week, the last 30 days, and the weekly streak', () => {
    const s = state(
      workout('a', '2026-11-24', { bench: [set(100, 5)] }),
      workout('b', '2026-11-17', { bench: [set(100, 5)] }),
      workout('c', '2026-11-12', { bench: [set(100, 5)] }),
      workout('d', '2026-10-27', { bench: [set(100, 5)] }), // 29 days back: day 30 of the window
      workout('e', '2026-10-26', { bench: [set(100, 5)] }), // 30 days back: outside
      workout('f', '2026-11-25', { bench: [set(100, 5, false)] }), // planned, not trained
    );
    expect(trainingCounts(s, today)).toEqual({ thisWeek: 1, last30Days: 4, weeklyStreak: 3 });
  });

  it('keeps the streak alive while the current week has no workout yet', () => {
    const s = state(
      workout('a', '2026-11-20', { bench: [set(100, 5)] }),
      workout('b', '2026-11-13', { bench: [set(100, 5)] }),
    );
    expect(trainingCounts(s, today).weeklyStreak).toBe(2);
  });

  it('breaks the streak on a missed week', () => {
    const s = state(
      workout('a', '2026-11-25', { bench: [set(100, 5)] }),
      workout('b', '2026-11-10', { bench: [set(100, 5)] }),
    );
    expect(trainingCounts(s, today).weeklyStreak).toBe(1);
  });

  it('is all zero with no workouts', () => {
    expect(trainingCounts(state(), today)).toEqual({ thisWeek: 0, last30Days: 0, weeklyStreak: 0 });
  });
});

describe('trainedExercises', () => {
  it('lists exercises with done sets, most recently trained first', () => {
    const s = state(
      workout('a', '2026-11-03', { bench: [set(100, 5)] }),
      workout('b', '2026-11-10', { squat: [set(100, 5)] }),
    );
    expect(trainedExercises(s).map((e) => e.id)).toEqual(['squat', 'bench']);
    expect(trainedExercises(state(workout('a', '2026-11-03', { bench: [set(1, 1, false)] })))).toEqual([]);
  });
});
