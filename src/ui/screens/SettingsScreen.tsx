import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { parseAppState } from '../../domain/backup';
import type { AppState, Exercise } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { exportBackup } from '../backupFile';
import { Icon } from '../components/Icon';
import { NumberField } from '../components/NumberField';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { formatSeconds } from '../format';

export function SettingsScreen({ onImported }: { onImported: () => Promise<void> }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const { settings } = state;
  const [renaming, setRenaming] = useState<Exercise | null>(null);
  const exercises = Object.values(state.exercises).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <header className="screen-header">
        <h1>Settings</h1>
      </header>

      <section className="group">
        <h2 className="group-title">Units</h2>
        <div className="card row">
          <span>Weight unit</span>
          <div className="segmented" role="radiogroup" aria-label="Weight unit">
            {(['kg', 'lb'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                role="radio"
                aria-checked={settings.unit === unit}
                onClick={() => dispatch({ type: 'settings/update', patch: { unit } })}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <p className="group-note">A label only. Changing it does not convert logged weights.</p>
      </section>

      <section className="group">
        <h2 className="group-title">Rest timer</h2>
        <div className="card">
          <label className="row toggle-row">
            <span>Start rest when a set is checked</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.autoStartRest}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { autoStartRest: e.currentTarget.checked } })}
            />
          </label>
          <RestPresets presets={settings.restPresetsSec} />
        </div>
        <p className="group-note">Auto-start uses the last preset you tapped ({formatSeconds(settings.lastRestSec)}).</p>
      </section>

      <section className="group">
        <h2 className="group-title">Exercises</h2>
        {exercises.length === 0 ? (
          <p className="group-note">Exercises you add to a workout show up here so you can rename them.</p>
        ) : (
          <ul className="card plain-list">
            {exercises.map((x) => (
              <li key={x.id}>
                <button type="button" className="row list-button" onClick={() => setRenaming(x)}>
                  <span>{x.name}</span>
                  <span className="muted">Rename</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Backup state={state} onImported={onImported} />

      {renaming && <RenameSheet exercise={renaming} onClose={() => setRenaming(null)} />}
    </>
  );
}

function RestPresets({ presets }: { presets: number[] }) {
  const dispatch = useDispatch();
  const [seconds, setSeconds] = useState(0);
  const save = (next: number[]) =>
    dispatch({ type: 'settings/update', patch: { restPresetsSec: [...new Set(next)].sort((a, b) => a - b) } });

  return (
    <div className="presets-editor">
      <span>Presets</span>
      <div className="chip-row">
        {presets.map((sec) => (
          <span key={sec} className="chip removable">
            {formatSeconds(sec)}
            <button
              type="button"
              aria-label={`Remove ${formatSeconds(sec)} preset`}
              disabled={presets.length === 1}
              onClick={() => save(presets.filter((p) => p !== sec))}
            >
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="add-preset"
        onSubmit={(e) => {
          e.preventDefault();
          if (seconds > 0) save([...presets, seconds]);
          setSeconds(0);
        }}
      >
        <NumberField label="New preset in seconds" integer placeholder="45" value={seconds} onCommit={setSeconds} />
        <span className="muted">seconds</span>
        <button type="submit" className="button small secondary" disabled={seconds <= 0}>
          Add
        </button>
      </form>
    </div>
  );
}

function RenameSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(exercise.name);
  return (
    <Sheet title="Rename exercise" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) dispatch({ type: 'exercise/rename', id: exercise.id, name: name.trim() });
          onClose();
        }}
      >
        <input className="text-field" autoFocus aria-label="Exercise name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <button type="submit" className="button" disabled={!name.trim()}>
          Save
        </button>
      </form>
    </Sheet>
  );
}

function Backup({ state, onImported }: { state: AppState; onImported: () => Promise<void> }) {
  const dispatch = useDispatch();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: string; state: AppState } | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const workoutCount = Object.keys(state.workouts).length;

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    const result = parseAppState(await file.text());
    if (result.ok) {
      setMessage(null);
      setPending({ file: file.name, state: result.state });
    } else {
      setMessage({ kind: 'error', text: result.error });
    }
  };

  return (
    <section className="group">
      <h2 className="group-title">Backup</h2>
      <div className="card stack">
        <p className="backup-note">
          Your data lives only on this phone. Export a backup now and then, and keep it in Files or iCloud Drive.
          {persisted === false && ' Safari may clear it if the app goes unused for weeks.'}
        </p>
        <button type="button" className="button secondary" onClick={() => void exportBackup(state)}>
          Export backup (JSON)
        </button>
        <button type="button" className="button secondary" onClick={() => input.current?.click()}>
          Import backup…
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden aria-label="Backup file" onChange={(e) => void onFile(e)} />
        {message && (
          <p className={message.kind === 'error' ? 'message error' : 'message ok'} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </div>

      {pending && (
        <ConfirmSheet
          title="Replace all data?"
          message={`Import ${Object.keys(pending.state.workouts).length} workouts from “${pending.file}”? This replaces the ${workoutCount} workouts on this phone.`}
          confirmLabel="Replace with backup"
          onClose={() => setPending(null)}
          onConfirm={() => {
            dispatch({ type: 'state/replace', state: pending.state });
            setPending(null);
            void onImported().then(() => setMessage({ kind: 'ok', text: 'Backup imported.' }));
          }}
        />
      )}
    </section>
  );
}
