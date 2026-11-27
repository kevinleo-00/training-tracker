import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { idbPersistence, requestPersistentStorage } from './store/idbPersistence';
import { StoreContext } from './store/react';
import { createStore, type Notice } from './store/store';
import { App } from './ui/App';
import { applyLocale, deviceLanguages, resolveLocale } from './ui/i18n';
import { applyTheme } from './ui/themes';
import './ui/styles.css';
import './ui/theme-pixel.css';

registerSW({ immediate: true });

const store = createStore(idbPersistence);

// iOS can kill a backgrounded web app without warning, so save the moment it hides.
const flush = () => void store.flush();
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

const { notice } = await store.load().catch(() => ({ notice: { kind: 'storage-blocked' } satisfies Notice }));
void requestPersistentStorage();

const syncDocument = () => {
  const { theme, language } = store.getState().settings;
  applyTheme(theme);
  applyLocale(resolveLocale(language, deviceLanguages()));
};
syncDocument();
store.subscribe(syncDocument);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App notice={notice} onImported={store.flush} />
    </StoreContext.Provider>
  </StrictMode>,
);
