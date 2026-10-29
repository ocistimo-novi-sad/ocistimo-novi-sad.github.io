import { HandHeart, Map, Rows3 } from 'lucide-react';
import { useApp } from '../state/app-context';

export function MobileTabBar() {
  const { mobileTab, setMobileTab, reports, actions, selectedReport, selectedAction, composeOpen } =
    useApp();

  if (selectedReport || selectedAction || composeOpen) return null;

  return (
    <nav className="tabbar" aria-label="Navigacija na mobilnom telefonu">
      <button
        type="button"
        className={`tabbar__item${mobileTab === 'map' ? ' is-active' : ''}`}
        aria-current={mobileTab === 'map' ? 'page' : undefined}
        onClick={() => setMobileTab('map')}
      >
        <Map size={18} aria-hidden="true" />
        <span>Mapa</span>
      </button>
      <button
        type="button"
        className={`tabbar__item${mobileTab === 'reports' ? ' is-active' : ''}`}
        aria-current={mobileTab === 'reports' ? 'page' : undefined}
        onClick={() => setMobileTab('reports')}
      >
        <Rows3 size={18} aria-hidden="true" />
        <span>Prijave</span>
        {reports.length > 0 ? <span className="tabbar__count">{reports.length}</span> : null}
      </button>
      <button
        type="button"
        className={`tabbar__item${mobileTab === 'actions' ? ' is-active' : ''}`}
        aria-current={mobileTab === 'actions' ? 'page' : undefined}
        onClick={() => setMobileTab('actions')}
      >
        <HandHeart size={18} aria-hidden="true" />
        <span>Akcije</span>
        {actions.length > 0 ? <span className="tabbar__count">{actions.length}</span> : null}
      </button>
    </nav>
  );
}
