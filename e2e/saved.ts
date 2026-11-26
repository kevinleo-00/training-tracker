import type { Page } from '@playwright/test';

/** The app document as saved in IndexedDB, serialized. */
export function readSaved(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('keyval').objectStore('keyval').get('app-state');
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            db.close();
            resolve(JSON.stringify(get.result ?? null));
          };
        };
      }),
  );
}
