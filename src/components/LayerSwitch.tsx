import { useEffect, useRef } from 'react';
import { canFocus } from '../hooks/useModalFocus';
import { isOpenReport, isUpcomingAction } from '../lib/counts';
import { useApp } from '../state/app-context';
import type { Layer } from '../types';

/** Set on a press; the list panel is swapped, and the new switch takes focus. */
let refocusSwitch = false;

/**
 * Chooses what the map and the list show: reports or cleanup actions. A pair
 * of toggle buttons, as it changes the same view rather than showing a tab panel.
 */
export function LayerSwitch({ className }: { className?: string }) {
  const { layer, setLayer, reports, actions } = useApp();
  const active = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!refocusSwitch) return;
    refocusSwitch = false;
    if (canFocus(active.current)) active.current.focus();
  }, []);

  const choose = (value: Layer) => {
    refocusSwitch = true;
    setLayer(value);
  };
  // The counts show only what people can still act on, and hide at zero (#31, #33).
  const now = Date.now();
  const openReports = reports.filter(isOpenReport).length;
  const upcomingActions = actions.filter((action) => isUpcomingAction(action, now)).length;

  return (
    <div
      className={`segmented segmented--layer${layer === 'actions' ? ' is-second' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Šta prikazati"
      data-guide="layer"
    >
      {/* The green pill slides to the chosen layer instead of jumping. */}
      <span className="segmented__pill" aria-hidden="true" />
      <button
        ref={layer === 'reports' ? active : undefined}
        type="button"
        aria-pressed={layer === 'reports'}
        className={`segmented__item${layer === 'reports' ? ' is-active' : ''}`}
        onClick={() => choose('reports')}
      >
        Prijave
        {openReports > 0 ? <span>{openReports}</span> : null}
      </button>
      <button
        ref={layer === 'actions' ? active : undefined}
        type="button"
        aria-pressed={layer === 'actions'}
        className={`segmented__item${layer === 'actions' ? ' is-active' : ''}`}
        onClick={() => choose('actions')}
      >
        Akcije
        {upcomingActions > 0 ? <span>{upcomingActions}</span> : null}
      </button>
    </div>
  );
}
