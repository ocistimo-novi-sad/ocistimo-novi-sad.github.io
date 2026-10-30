import type { ReactNode } from 'react';
import { HandHeart, Map, Rows3 } from 'lucide-react';
import { useApp, type MobileTab } from '../state/app-context';

function TabButton({
  tab,
  label,
  icon,
  count,
}: {
  tab: MobileTab;
  label: string;
  icon: ReactNode;
  count?: number;
}) {
  const { mobileTab, setMobileTab } = useApp();
  const active = mobileTab === tab;

  return (
    <button
      type="button"
      className={`tabbar__item${active ? ' is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => setMobileTab(tab)}
    >
      <span className="tabbar__icon">
        {icon}
        {count ? (
          <span className="tabbar__count" aria-hidden="true">
            {count}
          </span>
        ) : null}
      </span>
      <span>
        {label}
        {count ? <span className="visually-hidden"> ({count})</span> : null}
      </span>
    </button>
  );
}

export function MobileTabBar() {
  const { reports, actions, selectedReport, selectedAction, composeOpen } = useApp();

  if (selectedReport || selectedAction || composeOpen) return null;

  return (
    <nav className="tabbar" aria-label="Navigacija na mobilnom telefonu">
      <TabButton tab="map" label="Mapa" icon={<Map size={22} aria-hidden="true" />} />
      <TabButton
        tab="reports"
        label="Prijave"
        icon={<Rows3 size={22} aria-hidden="true" />}
        count={reports.length}
      />
      <TabButton
        tab="actions"
        label="Akcije"
        icon={<HandHeart size={22} aria-hidden="true" />}
        count={actions.length}
      />
    </nav>
  );
}
