import { useState } from 'react';
import { parseLocalDate, today as getToday } from '../../domain/dates';
import type { LocalDate, WorkoutId } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { dayLabel } from '../format';
import { newId } from '../ids';
import { href, navigate } from '../route';
import { sortedWorkouts, workoutSummary } from '../workouts';

export function WorkoutsScreen() {
  const state = useAppState();
  const [creating, setCreating] = useState(false);
  const workouts = sortedWorkouts(state);
  const today = getToday();

  return (
    <>
      <header className="screen-header">
        <h1>Workouts</h1>
        <button type="button" className="button small" onClick={() => setCreating(true)}>
          <Icon name="plus" size={18} />
          New
        </button>
      </header>

      {workouts.length === 0 ? (
        <div className="empty">
          <p className="empty-title">No workouts yet</p>
          <p>Tap New to log today’s training. Next time, you can copy it as your plan.</p>
          <button type="button" className="button" onClick={() => setCreating(true)}>
            Start a workout
          </button>
        </div>
      ) : (
        <ul className="card-list">
          {workouts.map((w) => (
            <li key={w.id}>
              <a className="card workout-card" href={href({ name: 'workout', id: w.id })}>
                <span className="workout-date">{dayLabel(w.date, today)}</span>
                <span className="workout-name">{w.name || 'Untitled workout'}</span>
                <span className="workout-meta">{workoutSummary(w)}</span>
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
  const [name, setName] = useState('');
  const [date, setDate] = useState<LocalDate>(getToday);
  const previous = sortedWorkouts(state).filter((w) => w.entries.length > 0);
  const today = getToday();

  const open = (id: WorkoutId) => {
    onClose();
    navigate({ name: 'workout', id });
  };

  return (
    <Sheet title="New workout" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const id = newId<WorkoutId>();
          dispatch({ type: 'workout/create', id, date, name: name.trim() || 'Workout' });
          open(id);
        }}
      >
        <label className="field">
          <span>Name</span>
          <input
            className="text-field"
            placeholder="Push day"
            autoCapitalize="words"
            enterKeyHint="go"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input
            className="text-field"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(parseLocalDate(e.currentTarget.value) ?? today)}
          />
        </label>
        <button type="submit" className="button">
          Start blank workout
        </button>
      </form>

      {previous.length > 0 && (
        <section className="sheet-section">
          <h3>Or copy a previous workout as the plan</h3>
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
                    <span className="pick-title">{w.name || 'Untitled workout'}</span>
                    <span className="pick-sub">
                      {dayLabel(w.date, today)} · {workoutSummary(w)}
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
