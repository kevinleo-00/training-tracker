import { useEffect } from 'react';
import { useRestTimer } from '../store/restTimer';
import type { Notice } from '../store/store';
import { RestTimerBar } from './components/RestTimerBar';
import { TabBar } from './components/TabBar';
import { useRoute } from './route';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { WorkoutsScreen } from './screens/WorkoutsScreen';

const noticeText = (notice: Notice) =>
  notice.kind === 'storage-blocked'
    ? 'This browser blocked storage, so workouts will not be saved. Private Browsing can cause this.'
    : `Your saved data could not be read, so the app started fresh. The old copy was kept aside. (${notice.detail})`;

export function App({ notice, onImported }: { notice: Notice | null; onImported: () => Promise<void> }) {
  const route = useRoute();
  const timer = useRestTimer();
  // The bar shows the countdown everywhere, and the presets while logging a workout.
  const showTimer = timer.status !== 'idle' || route.name === 'workout';
  const key = route.name === 'workout' ? `workout-${route.id}` : route.name;

  useEffect(() => scrollTo(0, 0), [key]);

  return (
    <div className={showTimer ? 'app with-timer' : 'app'}>
      <main className="screen" key={key}>
        {notice && (
          <p className="message error" role="alert">
            {noticeText(notice)}
          </p>
        )}
        {route.name === 'workouts' && <WorkoutsScreen />}
        {route.name === 'workout' && <WorkoutScreen id={route.id} />}
        {route.name === 'dashboard' && <DashboardScreen />}
        {route.name === 'settings' && <SettingsScreen onImported={onImported} />}
      </main>
      <div className="dock">
        {showTimer && <RestTimerBar />}
        <TabBar route={route} />
      </div>
    </div>
  );
}
