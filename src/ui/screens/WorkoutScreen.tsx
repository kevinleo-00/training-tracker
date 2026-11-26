import { useState } from 'react';
import { parseLocalDate, today } from '../../domain/dates';
import type { EntryId, SetId, Workout, WorkoutEntry, WorkoutId, WorkSet } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { ExercisePicker } from '../components/ExercisePicker';
import { Icon } from '../components/Icon';
import { NumberField } from '../components/NumberField';
import { ActionSheet, ConfirmSheet } from '../components/Sheet';
import { newId } from '../ids';
import { href, navigate } from '../route';
import { useStartRest } from '../useStartRest';

export function WorkoutScreen({ id }: { id: WorkoutId }) {
  const workout = useAppState().workouts[id];
  if (!workout) {
    return (
      <div className="empty">
        <p className="empty-title">Workout not found</p>
        <p>It may have been deleted.</p>
        <a className="button" href={href({ name: 'workouts' })}>
          Back to workouts
        </a>
      </div>
    );
  }
  return <WorkoutEditor workout={workout} />;
}

type Overlay = 'picker' | 'menu' | 'confirm-delete' | null;

function WorkoutEditor({ workout }: { workout: Workout }) {
  const dispatch = useDispatch();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = () => setOverlay(null);

  return (
    <>
      <header className="screen-header workout-header">
        <a className="back-link" href={href({ name: 'workouts' })}>
          <Icon name="back" />
          Workouts
        </a>
        <button type="button" className="icon-button" aria-label="Workout actions" onClick={() => setOverlay('menu')}>
          <Icon name="more" />
        </button>
      </header>

      <div className="workout-title">
        <input
          className="title-field"
          aria-label="Workout name"
          placeholder="Workout name"
          autoCapitalize="words"
          enterKeyHint="done"
          value={workout.name}
          onChange={(e) => dispatch({ type: 'workout/rename', id: workout.id, name: e.currentTarget.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <input
          className="date-field"
          type="date"
          aria-label="Workout date"
          required
          value={workout.date}
          onChange={(e) => {
            const date = parseLocalDate(e.currentTarget.value);
            if (date) dispatch({ type: 'workout/redate', id: workout.id, date });
          }}
        />
      </div>

      {workout.entries.length === 0 ? (
        <div className="empty compact">
          <p>Add your first exercise, then log each set as you go.</p>
        </div>
      ) : (
        <ol className="entry-list">
          {workout.entries.map((entry, index) => (
            <EntryCard key={entry.id} workout={workout} entry={entry} index={index} />
          ))}
        </ol>
      )}

      <button type="button" className="button add-exercise" onClick={() => setOverlay('picker')}>
        <Icon name="plus" size={20} />
        Add exercise
      </button>

      {overlay === 'picker' && (
        <ExercisePicker
          onClose={close}
          onPick={(exerciseId) => {
            dispatch({ type: 'entry/add', workoutId: workout.id, entryId: newId<EntryId>(), exerciseId, setId: newId<SetId>() });
            close();
          }}
        />
      )}
      {overlay === 'menu' && (
        <ActionSheet
          title={workout.name || 'Workout'}
          onClose={close}
          actions={[
            {
              label: 'Copy as today’s plan',
              icon: 'copy',
              disabled: workout.entries.length === 0,
              onSelect: () => {
                const id = newId<WorkoutId>();
                dispatch({ type: 'workout/copy', id, sourceId: workout.id, date: today() });
                navigate({ name: 'workout', id });
              },
            },
            { label: 'Delete workout', icon: 'trash', danger: true, onSelect: () => setOverlay('confirm-delete') },
          ]}
        />
      )}
      {overlay === 'confirm-delete' && (
        <ConfirmSheet
          title="Delete workout?"
          message={`“${workout.name || 'Untitled workout'}” and all its sets will be removed. This cannot be undone.`}
          confirmLabel="Delete workout"
          onClose={close}
          onConfirm={() => {
            navigate({ name: 'workouts' });
            dispatch({ type: 'workout/delete', id: workout.id });
          }}
        />
      )}
    </>
  );
}

function EntryCard({ workout, entry, index }: { workout: Workout; entry: WorkoutEntry; index: number }) {
  const { exercises, settings } = useAppState();
  const dispatch = useDispatch();
  const [menu, setMenu] = useState(false);
  const name = exercises[entry.exerciseId]?.name ?? 'Unknown exercise';
  const ref = { workoutId: workout.id, entryId: entry.id };
  const move = (toIndex: number) => dispatch({ type: 'entry/move', ...ref, toIndex });

  return (
    <li className="card entry-card">
      <div className="entry-header">
        <h2>{name}</h2>
        <button type="button" className="icon-button" aria-label={`${name} actions`} onClick={() => setMenu(true)}>
          <Icon name="more" />
        </button>
      </div>
      {entry.sets.length > 0 && (
        <div className="set-grid" role="table" aria-label={`${name} sets`}>
          <div className="set-row set-head" role="row">
            <span role="columnheader">Set</span>
            <span role="columnheader">{settings.unit}</span>
            <span role="columnheader">Reps</span>
            <span role="columnheader">
              <span className="sr-only">Done</span>
            </span>
            <span role="columnheader">
              <span className="sr-only">Remove</span>
            </span>
          </div>
          {entry.sets.map((set, i) => (
            <SetRow key={set.id} set={set} number={i + 1} entryRef={ref} exerciseName={name} />
          ))}
        </div>
      )}
      <button type="button" className="add-set" onClick={() => dispatch({ type: 'set/add', ...ref, setId: newId<SetId>() })}>
        <Icon name="plus" size={18} />
        Add set
      </button>
      {menu && (
        <ActionSheet
          title={name}
          onClose={() => setMenu(false)}
          actions={[
            { label: 'Move up', icon: 'up', disabled: index === 0, onSelect: () => move(index - 1) },
            { label: 'Move down', icon: 'down', disabled: index === workout.entries.length - 1, onSelect: () => move(index + 1) },
            { label: 'Remove exercise', icon: 'trash', danger: true, onSelect: () => dispatch({ type: 'entry/remove', ...ref }) },
          ]}
        />
      )}
    </li>
  );
}

function SetRow({
  set,
  number,
  entryRef,
  exerciseName,
}: {
  set: WorkSet;
  number: number;
  entryRef: { workoutId: WorkoutId; entryId: EntryId };
  exerciseName: string;
}) {
  const { settings } = useAppState();
  const dispatch = useDispatch();
  const startRest = useStartRest();
  const ref = { ...entryRef, setId: set.id };
  const label = `${exerciseName} set ${number}`;

  return (
    <div className={set.done ? 'set-row done' : 'set-row'} role="row">
      <span className="set-number" role="cell">
        {number}
      </span>
      <span role="cell">
        <NumberField label={`${label} weight`} value={set.weight} onCommit={(weight) => dispatch({ type: 'set/update', ...ref, weight })} />
      </span>
      <span role="cell">
        <NumberField label={`${label} reps`} integer value={set.reps} onCommit={(reps) => dispatch({ type: 'set/update', ...ref, reps })} />
      </span>
      <span role="cell">
        <button
          type="button"
          className="check"
          aria-label={`${label} done`}
          aria-pressed={set.done}
          onClick={() => {
            dispatch({ type: 'set/toggleDone', ...ref });
            if (!set.done && settings.autoStartRest) startRest(settings.lastRestSec);
          }}
        >
          <Icon name="check" size={22} />
        </button>
      </span>
      <span role="cell">
        <button type="button" className="icon-button remove-set" aria-label={`Remove ${label}`} onClick={() => dispatch({ type: 'set/remove', ...ref })}>
          <Icon name="close" size={18} />
        </button>
      </span>
    </div>
  );
}
