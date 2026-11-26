import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AppState } from '../domain/types';
import type { Store } from './store';

export const StoreContext = createContext<Store | null>(null);

function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext is missing');
  return store;
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

export function useDispatch(): Store['dispatch'] {
  return useStore().dispatch;
}
