import { useState } from 'react';
import { daysBetween, today as getToday } from '../../domain/dates';
import { exerciseProgress, personalRecords, trainedExercises, trainingCounts, weeklySummary } from '../../domain/stats';
import type { ExerciseId } from '../../domain/types';
import { useAppState } from '../../store/react';
import { BarChart, LineChart } from '../components/charts';
import { formatCompact, formatGrouped, formatNumber, shortDate } from '../format';
import { href } from '../route';

export function DashboardScreen() {
  const state = useAppState();
  const today = getToday();
  const unit = state.settings.unit;
  const counts = trainingCounts(state, today);
  const weeks = weeklySummary(state, today);
  const exercises = trainedExercises(state);

  return (
    <>
      <header className="screen-header">
        <h1>Dashboard</h1>
      </header>

      <div className="tiles">
        <Tile label="This week" value={counts.thisWeek} unit={counts.thisWeek === 1 ? 'workout' : 'workouts'} />
        <Tile label="30 days" value={counts.last30Days} unit={counts.last30Days === 1 ? 'workout' : 'workouts'} />
        <Tile label="Streak" value={counts.weeklyStreak} unit={counts.weeklyStreak === 1 ? 'week' : 'weeks'} />
      </div>

      {exercises.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No progress to show yet</p>
          <p>Check off sets in a workout and your trends, records, and weekly totals appear here.</p>
          <a className="button" href={href({ name: 'workouts' })}>
            Go to workouts
          </a>
        </div>
      ) : (
        <>
          <section className="card">
            <h2 className="card-title">Exercise progress</h2>
            <ExerciseProgress exercises={exercises} unit={unit} />
          </section>

          <section className="card">
            <h2 className="card-title">Workouts per week</h2>
            <BarChart
              title="Workouts per week, last 12 weeks"
              bars={weeks.map((w) => ({ key: w.weekStart, label: shortDate(w.weekStart), value: w.workouts }))}
              formatTick={(v) => formatNumber(v)}
              describe={(b) => `Week of ${b.label} · ${b.value} workout${b.value === 1 ? '' : 's'}`}
            />
          </section>

          <section className="card">
            <h2 className="card-title">Weekly volume</h2>
            <BarChart
              title={`Weekly volume in ${unit}, last 12 weeks`}
              bars={weeks.map((w) => ({ key: w.weekStart, label: shortDate(w.weekStart), value: w.volume }))}
              formatTick={formatCompact}
              describe={(b) => `Week of ${b.label} · ${formatGrouped(b.value)} ${unit}`}
            />
          </section>
        </>
      )}
    </>
  );
}

function Tile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      <span className="tile-unit">{unit}</span>
    </div>
  );
}

function ExerciseProgress({ exercises, unit }: { exercises: { id: ExerciseId; name: string }[]; unit: string }) {
  const state = useAppState();
  const [chosen, setChosen] = useState<ExerciseId | null>(null);
  const exercise = exercises.find((x) => x.id === chosen) ?? exercises[0]!;
  const progress = exerciseProgress(state, exercise.id);
  const pr = personalRecords(state, exercise.id);
  const first = progress[0]!.date;

  return (
    <>
      <select
        className="select-field"
        aria-label="Exercise"
        value={exercise.id}
        onChange={(e) => setChosen(e.currentTarget.value as ExerciseId)}
      >
        {exercises.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>

      <div className="records">
        {pr.heaviest && (
          <div className="record">
            <span className="tile-label">Heaviest set</span>
            <span className="record-value">
              {formatNumber(pr.heaviest.weight)} {unit} × {pr.heaviest.reps}
            </span>
            <span className="tile-unit">{shortDate(pr.heaviest.date)}</span>
          </div>
        )}
        {pr.bestE1RM && (
          <div className="record">
            <span className="tile-label">Best est. 1RM</span>
            <span className="record-value">
              {formatNumber(Math.round(pr.bestE1RM.e1rm * 10) / 10)} {unit}
            </span>
            <span className="tile-unit">
              {formatNumber(pr.bestE1RM.weight)} × {pr.bestE1RM.reps} · {shortDate(pr.bestE1RM.date)}
            </span>
          </div>
        )}
      </div>

      <LineChart
        title={`${exercise.name}: estimated 1RM and max weight per session`}
        series={[
          { name: 'Est. 1RM', className: 'series-1' },
          { name: 'Max weight', className: 'series-2' },
        ]}
        points={progress.map((p) => ({
          x: daysBetween(first, p.date),
          label: shortDate(p.date),
          values: [Math.round(p.bestE1RM * 10) / 10, p.maxWeight],
        }))}
        formatValue={(v) => `${formatNumber(v)} ${unit}`}
      />
    </>
  );
}
