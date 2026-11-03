import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CalendarPlus, Map, Plus, Rows3, TriangleAlert } from 'lucide-react';
import { isOpenReport, isUpcomingAction } from '../lib/counts';
import { useApp, type MobileTab } from '../state/app-context';

/**
 * Mobile navigation: map or list (what they show is the layer switch), with
 * the report button in the middle. Moderators and admins also get
 * "Nova akcija" from it.
 */
export function MobileTabBar() {
  const {
    mobileTab,
    setMobileTab,
    layer,
    reports,
    actions,
    startCompose,
    openModal,
    auth,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    // A pointer event, as taps on the map do not always produce mouse events;
    // on release, not on press (WCAG 2.5.2).
    const onPointerUp = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      createRef.current?.focus();
    };
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerup', onPointerUp);
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

  // Only what people can still act on: upcoming actions, open reports (#31, #33).
  const now = Date.now();
  const listCount =
    layer === 'actions'
      ? actions.filter((action) => isUpcomingAction(action, now)).length
      : reports.filter(isOpenReport).length;

  const onCreate = () => {
    if (auth.isModerator) {
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

      {/* For moderators a short list that opens and closes (WAI-ARIA disclosure). */}
      <div
        className="tabbar__create"
        ref={menuRef}
        onBlur={(event) => {
          if (!menuRef.current?.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
        }}
      >
        <button
          ref={createRef}
          type="button"
          className="tabbar__item tabbar__item--cta"
          data-guide="create"
          onClick={onCreate}
          aria-expanded={auth.isModerator ? menuOpen : undefined}
          aria-controls={auth.isModerator && menuOpen ? menuId : undefined}
        >
          <Plus size={20} aria-hidden="true" />
          <span>Prijavi</span>
        </button>

        {menuOpen ? (
          <div className="tabbar__menu" id={menuId}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                startCompose();
              }}
            >
              <TriangleAlert size={15} aria-hidden="true" /> Prijavi problem
            </button>
            <button
              type="button"
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
