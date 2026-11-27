import { validateAppState } from '../domain/backup';
import { type Action, reduce } from '../domain/reducer';
import { type AppState, emptyState } from '../domain/types';

export interface Persistence {
  load(): Promise<unknown>;
  save(state: AppState): Promise<void>;
  /** Keeps unreadable stored data somewhere safe before it gets overwritten. */
  quarantine(raw: unknown): Promise<void>;
}

export type Store = ReturnType<typeof createStore>;

/**
 * Something the person should know about storage, shown above the first screen.
 * For 'unreadable', `detail` is the developer-facing reason the stored data failed validation.
 */
export type Notice = { kind: 'storage-blocked' } | { kind: 'unreadable'; detail: string };

export function createStore(persistence: Persistence, delayMs = 300) {
  let state = emptyState();
  let pending: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  async function flush(): Promise<void> {
    if (pending === null) return;
    clearTimeout(pending);
    pending = null;
    await persistence.save(state);
  }

  return {
    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    async load(): Promise<{ notice: Notice | null }> {
      const raw = await persistence.load();
      if (raw === undefined) return { notice: null };
      const result = validateAppState(raw);
      if (result.ok) {
        state = result.state;
        return { notice: null };
      }
      await persistence.quarantine(raw);
      return { notice: { kind: 'unreadable', detail: result.error.detail } };
    },

    dispatch(action: Action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
      // Later changes ride along with the save already scheduled, so a steady
      // stream of edits never postpones saving past `delayMs`.
      pending ??= setTimeout(() => void flush(), delayMs);
    },

    flush,
  };
}
