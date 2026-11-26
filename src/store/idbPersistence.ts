import { get, set } from 'idb-keyval';
import type { Persistence } from './store';

const KEY = 'app-state';

export const idbPersistence: Persistence = {
  load: () => get(KEY),
  save: (state) => set(KEY, state),
  quarantine: (raw) => set(`${KEY}-unreadable-${Date.now()}`, raw),
};

/** Asks the browser not to evict this origin's storage. Safari may still say no. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
