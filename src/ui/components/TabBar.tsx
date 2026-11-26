import { href, type Route } from '../route';
import { Icon, type IconName } from './Icon';

const tabs: { label: string; icon: IconName; route: Route; matches: Route['name'][] }[] = [
  { label: 'Workouts', icon: 'list', route: { name: 'workouts' }, matches: ['workouts', 'workout'] },
  { label: 'Dashboard', icon: 'chart', route: { name: 'dashboard' }, matches: ['dashboard'] },
  { label: 'Settings', icon: 'gear', route: { name: 'settings' }, matches: ['settings'] },
];

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map((t) => {
        const active = t.matches.includes(route.name);
        return (
          <a key={t.label} href={href(t.route)} className={active ? 'tab active' : 'tab'} aria-current={active ? 'page' : undefined}>
            <Icon name={t.icon} size={24} />
            <span>{t.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
