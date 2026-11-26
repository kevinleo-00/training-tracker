import { useSyncExternalStore } from 'react';
import type { WorkoutId } from '../domain/types';

export type Route =
  | { name: 'workouts' }
  | { name: 'workout'; id: WorkoutId }
  | { name: 'dashboard' }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, '').split('/');
  if (first === 'w' && second) return { name: 'workout', id: decodeURIComponent(second) as WorkoutId };
  if (first === 'dashboard') return { name: 'dashboard' };
  if (first === 'settings') return { name: 'settings' };
  return { name: 'workouts' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'workouts':
      return '#/';
    case 'workout':
      return `#/w/${encodeURIComponent(route.id)}`;
    case 'dashboard':
      return '#/dashboard';
    case 'settings':
      return '#/settings';
  }
}

export function navigate(route: Route) {
  location.hash = href(route);
}

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb);
  return () => removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return parseRoute(hash);
}
