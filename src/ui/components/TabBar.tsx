import { useI18n } from '../i18n';
import { href, type Route } from '../route';
import { Icon, type IconName } from './Icon';

const tabs: { name: 'workouts' | 'dashboard' | 'settings'; icon: IconName; matches: Route['name'][] }[] = [
  { name: 'workouts', icon: 'list', matches: ['workouts', 'workout'] },
  { name: 'dashboard', icon: 'chart', matches: ['dashboard'] },
  { name: 'settings', icon: 'gear', matches: ['settings'] },
];

export function TabBar({ route }: { route: Route }) {
  const { t } = useI18n();
  return (
    <nav className="tab-bar" aria-label={t.tabs.label}>
      {tabs.map((tab) => {
        const active = tab.matches.includes(route.name);
        return (
          <a key={tab.name} href={href({ name: tab.name })} className={active ? 'tab active' : 'tab'} aria-current={active ? 'page' : undefined}>
            <Icon name={tab.icon} size={24} />
            <span>{t.tabs[tab.name]}</span>
          </a>
        );
      })}
    </nav>
  );
}
