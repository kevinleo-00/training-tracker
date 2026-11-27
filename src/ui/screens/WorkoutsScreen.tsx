import { useState } from 'react';
import { parseLocalDate, today as getToday } from '../../domain/dates';
import type { LocalDate, WorkoutId } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { dayLabel } from '../format';
import { useI18n } from '../i18n';
import { newId } from '../ids';
import { href, navigate } from '../route';
import { sortedWorkouts, workoutSummary } from '../workouts';

export function WorkoutsScreen() {
  const state = useAppState();
  const [creating, setCreating] = useState(false);
  const i18n = useI18n();
  const { t } = i18n;
  const workouts = sortedWorkouts(state);
  const today = getToday();

  return (
    <>
      <header className="screen-header">
        <h1>{t.tabs.workouts}</h1>
        <button type="button" className="button small" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} />
          {t.workouts.new}
        </button>
      </header>

      {workouts.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{t.workouts.emptyTitle}</p>
          <p>{t.workouts.emptyBody}</p>
          <button type="button" className="button" onClick={() => setCreating(true)}>
            {t.workouts.start}
          </button>
        </div>
      ) : (
        <ul className="card-list">
          {workouts.map((w) => (
            <li key={w.id}>
              <a className="card workout-card" href={href({ name: 'workout', id: w.id })}>
                <span className="workout-date">{dayLabel(w.date, today, i18n)}</span>
                <span className="workout-name">{w.name || t.common.untitledWorkout}</span>
                <span className="workout-meta">{workoutSummary(w, t)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {creating && <NewWorkoutSheet onClose={() => setCreating(false)} />}
    </>
  );
}

function NewWorkoutSheet({ onClose }: { onClose: () => void }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const i18n = useI18n();
  const { t } = i18n;
  const [name, setName] = useState('');
  const [date, setDate] = useState<LocalDate>(getToday);
  const previous = sortedWorkouts(state).filter((w) => w.entries.length > 0);
  const today = getToday();

  const open = (id: WorkoutId) => {
    onClose();
    navigate({ name: 'workout', id });
  };

  return (
    <Sheet title={t.workouts.newTitle} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const id = newId<WorkoutId>();
          dispatch({ type: 'workout/create', id, date, name: name.trim() || t.common.defaultWorkoutName });
          open(id);
        }}
      >
        <label className="field">
          <span>{t.workouts.name}</span>
          <input
            className="text-field"
            placeholder={t.workouts.namePlaceholder}
            autoCapitalize="words"
            enterKeyHint="go"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </label>
        <label className="field">
          <span>{t.workouts.date}</span>
          <input
            className="text-field"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(parseLocalDate(e.currentTarget.value) ?? today)}
          />
        </label>
        <button type="submit" className="button">
          {t.workouts.startBlank}
        </button>
      </form>

      {previous.length > 0 && (
        <section className="sheet-section">
          <h3>{t.workouts.copyHeading}</h3>
          <ul className="pick-list">
            {previous.slice(0, 30).map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className="pick two-line"
                  onClick={() => {
                    const id = newId<WorkoutId>();
                    dispatch({ type: 'workout/copy', id, sourceId: w.id, date });
                    open(id);
                  }}
                >
                  <Icon name="copy" size={20} />
                  <span>
                    <span className="pick-title">{w.name || t.common.untitledWorkout}</span>
                    <span className="pick-sub">
                      {dayLabel(w.date, today, i18n)} · {workoutSummary(w, t)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
