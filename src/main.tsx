import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { idbPersistence, requestPersistentStorage } from './store/idbPersistence';
import { StoreContext } from './store/react';
import { createStore } from './store/store';
import { App } from './ui/App';
import { applyTheme } from './ui/themes';
import './ui/styles.css';
import './ui/theme-pixel.css';

registerSW({ immediate: true });

const store = createStore(idbPersistence);

// iOS can kill a backgrounded web app without warning, so save the moment it hides.
const flush = () => void store.flush();
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

const { notice } = await store.load().catch(() => ({
  notice: 'This browser blocked storage, so workouts will not be saved. Private Browsing can cause this.',
}));
void requestPersistentStorage();

const syncTheme = () => applyTheme(store.getState().settings.theme);
syncTheme();
store.subscribe(syncTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreContext.Provider value={store}>
      <App notice={notice} onImported={store.flush} />
    </StoreContext.Provider>
  </StrictMode>,
);
