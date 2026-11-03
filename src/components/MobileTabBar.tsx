import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CalendarPlus, Map, Plus, Rows3, TriangleAlert } from 'lucide-react';
import { isOpenReport, isUpcomingAction } from '../lib/counts';
import { useApp, type MobileTab } from '../state/app-context';

/**
 * Mobile navigation: map or list (what they show is the layer switch), with
 * the report button in the middle. Admins also get "Nova akcija" from it.
 */
export function MobileTabBar() {
  const {
    mobileTab,
    setMobileTab,
    layer,
    reports,
    actions,
    selectedReport,
    selectedAction,
    composeOpen,
    startCompose,
    openModal,
    auth,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // pointerdown, not mousedown: taps on the map do not always produce a mousedown.
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Map and list slide like two sides of one screen where the browser supports it.
  const switchTab = (tab: MobileTab) => {
    if (tab === mobileTab) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('startViewTransition' in document) || reduceMotion) {
      setMobileTab(tab);
      return;
    }
    document.documentElement.dataset.slide = tab === 'list' ? 'left' : 'right';
    document.startViewTransition(() => flushSync(() => setMobileTab(tab)));
  };

  if (selectedReport || selectedAction || composeOpen) return null;

  // Only what people can still act on: upcoming actions, open reports (#31, #33).
  const now = Date.now();
  const listCount =
    layer === 'actions'
      ? actions.filter((action) => isUpcomingAction(action, now)).length
      : reports.filter(isOpenReport).length;

  const onCreate = () => {
    if (auth.isAdmin) {
      setMenuOpen((value) => !value);
      return;
    }
    startCompose();
  };

  return (
    <nav className="tabbar" aria-label="Navigacija na mobilnom telefonu">
      <button
        type="button"
        className={`tabbar__item${mobileTab === 'map' ? ' is-active' : ''}`}
        aria-current={mobileTab === 'map' ? 'page' : undefined}
        onClick={() => switchTab('map')}
      >
        <Map size={18} aria-hidden="true" />
        <span>Mapa</span>
      </button>

      <div className="tabbar__create" ref={menuRef}>
        <button
          type="button"
          className="tabbar__item tabbar__item--cta"
          data-guide="create"
          onClick={onCreate}
          aria-expanded={auth.isAdmin ? menuOpen : undefined}
          aria-haspopup={auth.isAdmin ? 'menu' : undefined}
        >
          <Plus size={20} aria-hidden="true" />
          <span>Prijavi</span>
        </button>

        {menuOpen ? (
          <div className="tabbar__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                startCompose();
              }}
            >
              <TriangleAlert size={15} aria-hidden="true" /> Prijavi problem
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                openModal({ kind: 'admin' });
              }}
            >
              <CalendarPlus size={15} aria-hidden="true" /> Nova akcija
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`tabbar__item${mobileTab === 'list' ? ' is-active' : ''}`}
        aria-current={mobileTab === 'list' ? 'page' : undefined}
        onClick={() => switchTab('list')}
        data-guide="list"
      >
        <Rows3 size={18} aria-hidden="true" />
        <span>Lista</span>
        {listCount > 0 ? <span className="tabbar__count">{listCount}</span> : null}
      </button>
    </nav>
  );
}
