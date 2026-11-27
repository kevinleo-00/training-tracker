import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { type BackupError, parseAppState } from '../../domain/backup';
import { type AppState, type Exercise, type Language, LANGUAGES, THEME_IDS } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { exportBackup } from '../backupFile';
import { Icon } from '../components/Icon';
import { NumberField } from '../components/NumberField';
import { ConfirmSheet, Sheet } from '../components/Sheet';
import { formatSeconds } from '../format';
import { deviceLanguages, LANGUAGE_NAMES, type Messages, resolveLocale, useI18n } from '../i18n';

export function SettingsScreen({ onImported }: { onImported: () => Promise<void> }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const { locale, t } = useI18n();
  const { settings } = state;
  const [renaming, setRenaming] = useState<Exercise | null>(null);
  const exercises = Object.values(state.exercises).sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <>
      <header className="screen-header">
        <h1>{t.tabs.settings}</h1>
      </header>

      <section className="group">
        <h2 className="group-title">{t.settings.appearance}</h2>
        <div className="theme-picker" role="radiogroup" aria-label={t.settings.theme}>
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              className="theme-option"
              aria-checked={settings.theme === id}
              onClick={() => dispatch({ type: 'settings/update', patch: { theme: id } })}
            >
              <span className="theme-preview" data-theme={id} aria-hidden="true">
                <span className="theme-preview-window">
                  <span className="theme-preview-text">{t.settings.themePreview}</span>
                  <span className="theme-preview-gauge" />
                </span>
              </span>
              <span className="theme-name">{t.themes[id].label}</span>
              <span className="theme-description">{t.themes[id].description}</span>
            </button>
          ))}
        </div>
      </section>

      <LanguagePicker language={settings.language} />

      <section className="group">
        <h2 className="group-title">{t.settings.units}</h2>
        <div className="card row">
          <span>{t.settings.weightUnit}</span>
          <div className="segmented" role="radiogroup" aria-label={t.settings.weightUnit}>
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
        <p className="group-note">{t.settings.unitNote}</p>
      </section>

      <section className="group">
        <h2 className="group-title">{t.settings.restTimer}</h2>
        <div className="card">
          <label className="row toggle-row">
            <span>{t.settings.autoStart}</span>
            <input
              type="checkbox"
              className="switch"
              checked={settings.autoStartRest}
              onChange={(e) => dispatch({ type: 'settings/update', patch: { autoStartRest: e.currentTarget.checked } })}
            />
          </label>
          <RestPresets presets={settings.restPresetsSec} />
        </div>
        <p className="group-note">{t.settings.autoStartNote(formatSeconds(settings.lastRestSec))}</p>
      </section>

      <section className="group">
        <h2 className="group-title">{t.settings.exercises}</h2>
        {exercises.length === 0 ? (
          <p className="group-note">{t.settings.exercisesEmpty}</p>
        ) : (
          <ul className="card plain-list">
            {exercises.map((x) => (
              <li key={x.id}>
                <button type="button" className="row list-button" onClick={() => setRenaming(x)}>
                  <span>{x.name}</span>
                  <span className="muted">{t.settings.rename}</span>
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

function LanguagePicker({ language }: { language: Language }) {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const device = resolveLocale('system', deviceLanguages());

  return (
    <section className="group">
      <h2 className="group-title">{t.settings.language}</h2>
      <div className="card choice-list" role="radiogroup" aria-label={t.settings.language}>
        {LANGUAGES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            className="choice"
            aria-checked={language === value}
            onClick={() => dispatch({ type: 'settings/update', patch: { language: value } })}
          >
            {/* Each language is named in its own script, tagged so it gets that language's glyphs. */}
            {value === 'system' ? (
              <>
                <span className="choice-label">{t.settings.automatic}</span>
                <span className="choice-detail" lang={device}>
                  {LANGUAGE_NAMES[device]}
                </span>
              </>
            ) : (
              <span className="choice-label" lang={value}>
                {LANGUAGE_NAMES[value]}
              </span>
            )}
            <Icon name="check" size={20} />
          </button>
        ))}
      </div>
    </section>
  );
}

function RestPresets({ presets }: { presets: number[] }) {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(0);
  const save = (next: number[]) =>
    dispatch({ type: 'settings/update', patch: { restPresetsSec: [...new Set(next)].sort((a, b) => a - b) } });

  return (
    <div className="presets-editor">
      <span>{t.settings.presets}</span>
      <div className="chip-row">
        {presets.map((sec) => (
          <span key={sec} className="chip removable">
            {formatSeconds(sec)}
            <button
              type="button"
              aria-label={t.settings.removePreset(formatSeconds(sec))}
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
        <NumberField label={t.settings.newPreset} integer placeholder="45" value={seconds} onCommit={setSeconds} />
        <span className="muted">{t.settings.seconds}</span>
        <button type="submit" className="button small secondary" disabled={seconds <= 0}>
          {t.common.add}
        </button>
      </form>
    </div>
  );
}

function RenameSheet({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const [name, setName] = useState(exercise.name);
  return (
    <Sheet title={t.settings.renameTitle} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) dispatch({ type: 'exercise/rename', id: exercise.id, name: name.trim() });
          onClose();
        }}
      >
        <input className="text-field" autoFocus aria-label={t.picker.name} value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <button type="submit" className="button" disabled={!name.trim()}>
          {t.common.save}
        </button>
      </form>
    </Sheet>
  );
}

const backupErrorText = (error: BackupError, t: Messages) =>
  error.kind === 'not-json' ? t.backup.notJson : t.backup.invalid(error.detail);

function Backup({ state, onImported }: { state: AppState; onImported: () => Promise<void> }) {
  const dispatch = useDispatch();
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: string; state: AppState } | null>(null);
  const [message, setMessage] = useState<{ kind: 'error'; error: BackupError } | { kind: 'ok' } | null>(null);
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
      setMessage({ kind: 'error', error: result.error });
    }
  };

  return (
    <section className="group">
      <h2 className="group-title">{t.backup.title}</h2>
      <div className="card stack">
        <p className="backup-note">
          {t.backup.note}
          {persisted === false && t.backup.evictionNote}
        </p>
        <button type="button" className="button secondary" onClick={() => void exportBackup(state)}>
          {t.backup.export}
        </button>
        <button type="button" className="button secondary" onClick={() => input.current?.click()}>
          {t.backup.import}
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden aria-label={t.backup.file} onChange={(e) => void onFile(e)} />
        {message?.kind === 'error' && (
          <p className="message error" role="alert">
            {backupErrorText(message.error, t)}
          </p>
        )}
        {message?.kind === 'ok' && (
          <p className="message ok" role="status">
            {t.backup.imported}
          </p>
        )}
      </div>

      {pending && (
        <ConfirmSheet
          title={t.backup.replaceTitle}
          message={t.backup.replaceMessage(Object.keys(pending.state.workouts).length, pending.file, workoutCount)}
          confirmLabel={t.backup.replaceConfirm}
          onClose={() => setPending(null)}
          onConfirm={() => {
            dispatch({ type: 'state/replace', state: pending.state });
            setPending(null);
            void onImported().then(() => setMessage({ kind: 'ok' }));
          }}
        />
      )}
    </section>
  );
}
