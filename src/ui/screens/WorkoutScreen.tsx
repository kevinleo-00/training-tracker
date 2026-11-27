import { useState } from 'react';
import { parseLocalDate, today } from '../../domain/dates';
import type { EntryId, SetId, Workout, WorkoutEntry, WorkoutId, WorkSet } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { ExercisePicker } from '../components/ExercisePicker';
import { Icon } from '../components/Icon';
import { NumberField } from '../components/NumberField';
import { ActionSheet, ConfirmSheet } from '../components/Sheet';
import { useI18n } from '../i18n';
import { newId } from '../ids';
import { href, navigate } from '../route';
import { useStartRest } from '../useStartRest';

export function WorkoutScreen({ id }: { id: WorkoutId }) {
  const workout = useAppState().workouts[id];
  const { t } = useI18n();
  if (!workout) {
    return (
      <div className="empty">
        <p className="empty-title">{t.workout.notFoundTitle}</p>
        <p>{t.workout.notFoundBody}</p>
        <a className="button" href={href({ name: 'workouts' })}>
          {t.workout.backToWorkouts}
        </a>
      </div>
    );
  }
  return <WorkoutEditor workout={workout} />;
}

type Overlay = 'picker' | 'menu' | 'confirm-delete' | null;

function WorkoutEditor({ workout }: { workout: Workout }) {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = () => setOverlay(null);

  return (
    <>
      <header className="screen-header workout-header">
        <a className="back-link" href={href({ name: 'workouts' })}>
          <Icon name="back" />
          {t.tabs.workouts}
        </a>
        <button type="button" className="icon-button" aria-label={t.workout.actions} onClick={() => setOverlay('menu')}>
          <Icon name="more" />
        </button>
      </header>

      <div className="workout-title">
        <input
          className="title-field"
          aria-label={t.workout.name}
          placeholder={t.workout.name}
          autoCapitalize="words"
          enterKeyHint="done"
          value={workout.name}
          onChange={(e) => dispatch({ type: 'workout/rename', id: workout.id, name: e.currentTarget.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <input
          className="date-field"
          type="date"
          aria-label={t.workout.date}
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
          <p>{t.workout.emptyBody}</p>
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
        {t.workout.addExercise}
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
          title={workout.name || t.common.untitledWorkout}
          onClose={close}
          actions={[
            {
              label: t.workout.copyAsTodaysPlan,
              icon: 'copy',
              disabled: workout.entries.length === 0,
              onSelect: () => {
                const id = newId<WorkoutId>();
                dispatch({ type: 'workout/copy', id, sourceId: workout.id, date: today() });
                navigate({ name: 'workout', id });
              },
            },
            { label: t.workout.delete, icon: 'trash', danger: true, onSelect: () => setOverlay('confirm-delete') },
          ]}
        />
      )}
      {overlay === 'confirm-delete' && (
        <ConfirmSheet
          title={t.workout.deleteTitle}
          message={t.workout.deleteMessage(workout.name || t.common.untitledWorkout)}
          confirmLabel={t.workout.delete}
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
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const name = exercises[entry.exerciseId]?.name ?? t.common.unknownExercise;
  const ref = { workoutId: workout.id, entryId: entry.id };
  const move = (toIndex: number) => dispatch({ type: 'entry/move', ...ref, toIndex });

  return (
    <li className="card entry-card">
      <div className="entry-header">
        <h2>{name}</h2>
        <button type="button" className="icon-button" aria-label={t.workout.exerciseActions(name)} onClick={() => setMenu(true)}>
          <Icon name="more" />
        </button>
      </div>
      {entry.sets.length > 0 && (
        <div className="set-grid" role="table" aria-label={t.workout.sets(name)}>
          <div className="set-row set-head" role="row">
            <span role="columnheader">{t.workout.setColumn}</span>
            <span role="columnheader">{settings.unit}</span>
            <span role="columnheader">{t.workout.repsColumn}</span>
            <span role="columnheader">
              <span className="sr-only">{t.workout.doneColumn}</span>
            </span>
            <span role="columnheader">
              <span className="sr-only">{t.workout.removeColumn}</span>
            </span>
          </div>
          {entry.sets.map((set, i) => (
            <SetRow key={set.id} set={set} number={i + 1} entryRef={ref} exerciseName={name} />
          ))}
        </div>
      )}
      <button type="button" className="add-set" onClick={() => dispatch({ type: 'set/add', ...ref, setId: newId<SetId>() })}>
        <Icon name="plus" size={18} />
        {t.workout.addSet}
      </button>
      {menu && (
        <ActionSheet
          title={name}
          onClose={() => setMenu(false)}
          actions={[
            { label: t.workout.moveUp, icon: 'up', disabled: index === 0, onSelect: () => move(index - 1) },
            { label: t.workout.moveDown, icon: 'down', disabled: index === workout.entries.length - 1, onSelect: () => move(index + 1) },
            { label: t.workout.removeExercise, icon: 'trash', danger: true, onSelect: () => dispatch({ type: 'entry/remove', ...ref }) },
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
  const { t } = useI18n();
  const ref = { ...entryRef, setId: set.id };

  return (
    <div className={set.done ? 'set-row done' : 'set-row'} role="row">
      <span className="set-number" role="cell">
        {number}
      </span>
      <span role="cell">
        <NumberField label={t.workout.setWeight(exerciseName, number)} value={set.weight} onCommit={(weight) => dispatch({ type: 'set/update', ...ref, weight })} />
      </span>
      <span role="cell">
        <NumberField label={t.workout.setReps(exerciseName, number)} integer value={set.reps} onCommit={(reps) => dispatch({ type: 'set/update', ...ref, reps })} />
      </span>
      <span role="cell">
        <button
          type="button"
          className="check"
          aria-label={t.workout.setDone(exerciseName, number)}
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
        <button type="button" className="icon-button remove-set" aria-label={t.workout.removeSet(exerciseName, number)} onClick={() => dispatch({ type: 'set/remove', ...ref })}>
          <Icon name="close" size={18} />
        </button>
      </span>
    </div>
  );
}
