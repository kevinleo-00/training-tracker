import { useMemo, useState } from 'react';
import type { AppState, ExerciseId, LocalDate } from '../../domain/types';
import { useAppState, useDispatch } from '../../store/react';
import { newId } from '../ids';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** Exercises ordered by most recent use, then name; never-used ones last. */
function byRecentUse(state: AppState) {
  const lastUsed = new Map<ExerciseId, LocalDate>();
  for (const w of Object.values(state.workouts)) {
    for (const e of w.entries) {
      const seen = lastUsed.get(e.exerciseId);
      if (!seen || w.date > seen) lastUsed.set(e.exerciseId, w.date);
    }
  }
  return Object.values(state.exercises).sort((a, b) => {
    const da = lastUsed.get(a.id) ?? '';
    const db = lastUsed.get(b.id) ?? '';
    return da === db ? a.name.localeCompare(b.name) : da < db ? 1 : -1;
  });
}

export function ExercisePicker({ onPick, onClose }: { onPick: (id: ExerciseId) => void; onClose: () => void }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const [query, setQuery] = useState('');
  const all = useMemo(() => byRecentUse(state), [state]);
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all;
  const exact = all.some((x) => x.name.toLowerCase() === q);

  const create = () => {
    const id = newId<ExerciseId>();
    dispatch({ type: 'exercise/create', id, name: query.trim() });
    onPick(id);
  };

  return (
    <Sheet title="Add exercise" onClose={onClose} tall>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches.length === 1 && matches[0]) onPick(matches[0].id);
          else if (q && !exact) create();
        }}
      >
        <input
          className="text-field"
          type="search"
          autoFocus
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="go"
          placeholder="Search or name a new exercise"
          aria-label="Exercise name"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </form>
      <ul className="pick-list">
        {matches.map((x) => (
          <li key={x.id}>
            <button type="button" className="pick" onClick={() => onPick(x.id)}>
              {x.name}
            </button>
          </li>
        ))}
        {q && !exact && (
          <li>
            <button type="button" className="pick create" onClick={create}>
              <Icon name="plus" />
              Create “{query.trim()}”
            </button>
          </li>
        )}
      </ul>
      {all.length === 0 && !q && <p className="hint">Type a name like “Bench press” to create your first exercise.</p>}
    </Sheet>
  );
}
