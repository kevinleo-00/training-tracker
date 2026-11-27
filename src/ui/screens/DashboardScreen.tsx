import { useState } from 'react';
import { daysBetween, today as getToday } from '../../domain/dates';
import { exerciseProgress, personalRecords, trainedExercises, trainingCounts, weeklySummary } from '../../domain/stats';
import type { ExerciseId } from '../../domain/types';
import { useAppState } from '../../store/react';
import { BarChart, LineChart } from '../components/charts';
import { formatCompact, formatGrouped, formatNumber, shortDate } from '../format';
import { useI18n } from '../i18n';
import { href } from '../route';

export function DashboardScreen() {
  const state = useAppState();
  const { locale, t } = useI18n();
  const today = getToday();
  const unit = state.settings.unit;
  const counts = trainingCounts(state, today);
  const weeks = weeklySummary(state, today);
  const exercises = trainedExercises(state);

  return (
    <>
      <header className="screen-header">
        <h1>{t.tabs.dashboard}</h1>
      </header>

      <div className="tiles">
        <Tile label={t.dashboard.thisWeek} value={counts.thisWeek} unit={t.dashboard.workoutsUnit(counts.thisWeek)} />
        <Tile label={t.dashboard.last30Days} value={counts.last30Days} unit={t.dashboard.workoutsUnit(counts.last30Days)} />
        <Tile label={t.dashboard.streak} value={counts.weeklyStreak} unit={t.dashboard.weeksUnit(counts.weeklyStreak)} />
      </div>

      {exercises.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{t.dashboard.emptyTitle}</p>
          <p>{t.dashboard.emptyBody}</p>
          <a className="button" href={href({ name: 'workouts' })}>
            {t.dashboard.goToWorkouts}
          </a>
        </div>
      ) : (
        <>
          <section className="card">
            <h2 className="card-title">{t.dashboard.progress}</h2>
            <ExerciseProgress exercises={exercises} unit={unit} />
          </section>

          <section className="card">
            <h2 className="card-title">{t.dashboard.perWeek}</h2>
            <BarChart
              title={t.dashboard.perWeekChart}
              bars={weeks.map((w) => ({ key: w.weekStart, label: shortDate(w.weekStart, locale), value: w.workouts }))}
              formatTick={(v) => formatNumber(v)}
              describe={(b) => t.dashboard.weekWorkouts(b.label, b.value)}
            />
          </section>

          <section className="card">
            <h2 className="card-title">{t.dashboard.volume}</h2>
            <BarChart
              title={t.dashboard.volumeChart(unit)}
              bars={weeks.map((w) => ({ key: w.weekStart, label: shortDate(w.weekStart, locale), value: w.volume }))}
              formatTick={(v) => formatCompact(v, locale)}
              describe={(b) => t.dashboard.weekVolume(b.label, `${formatGrouped(b.value, locale)} ${unit}`)}
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
  const { locale, t } = useI18n();
  const [chosen, setChosen] = useState<ExerciseId | null>(null);
  const exercise = exercises.find((x) => x.id === chosen) ?? exercises[0]!;
  const progress = exerciseProgress(state, exercise.id);
  const pr = personalRecords(state, exercise.id);
  const first = progress[0]!.date;

  return (
    <>
      <select
        className="select-field"
        aria-label={t.dashboard.exercise}
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
            <span className="tile-label">{t.dashboard.heaviest}</span>
            <span className="record-value">
              {formatNumber(pr.heaviest.weight)} {unit} × {pr.heaviest.reps}
            </span>
            <span className="tile-unit">{shortDate(pr.heaviest.date, locale)}</span>
          </div>
        )}
        {pr.bestE1RM && (
          <div className="record">
            <span className="tile-label">{t.dashboard.bestE1rm}</span>
            <span className="record-value">
              {formatNumber(Math.round(pr.bestE1RM.e1rm * 10) / 10)} {unit}
            </span>
            <span className="tile-unit">
              {formatNumber(pr.bestE1RM.weight)} × {pr.bestE1RM.reps} · {shortDate(pr.bestE1RM.date, locale)}
            </span>
          </div>
        )}
      </div>

      <LineChart
        title={t.dashboard.progressChart(exercise.name)}
        series={[
          { name: t.dashboard.e1rm, className: 'series-1' },
          { name: t.dashboard.maxWeight, className: 'series-2' },
        ]}
        points={progress.map((p) => ({
          x: daysBetween(first, p.date),
          label: shortDate(p.date, locale),
          values: [Math.round(p.bestE1RM * 10) / 10, p.maxWeight],
        }))}
        formatValue={(v) => `${formatNumber(v)} ${unit}`}
        dateLabel={t.dashboard.date}
      />
    </>
  );
}
