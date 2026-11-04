import { isOpenReport, isUpcomingAction } from '../lib/counts';
import { useApp } from '../state/app-context';

/** Chooses what the map and the list show: reports or cleanup actions. */
export function LayerSwitch({ className }: { className?: string }) {
  const { layer, setLayer, reports, actions } = useApp();
  // The counts show only what people can still act on, and hide at zero (#31, #33).
  const now = Date.now();
  const openReports = reports.filter(isOpenReport).length;
  const upcomingActions = actions.filter((action) => isUpcomingAction(action, now)).length;

  return (
    <div
      className={`segmented segmented--layer${layer === 'actions' ? ' is-second' : ''}${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label="Šta prikazati"
      data-guide="layer"
    >
      {/* The green pill slides to the chosen layer instead of jumping. */}
      <span className="segmented__pill" aria-hidden="true" />
      <button
        type="button"
        role="tab"
        aria-selected={layer === 'reports'}
        className={`segmented__item${layer === 'reports' ? ' is-active' : ''}`}
        onClick={() => setLayer('reports')}
      >
        Prijave
        {openReports > 0 ? <span>{openReports}</span> : null}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={layer === 'actions'}
        className={`segmented__item${layer === 'actions' ? ' is-active' : ''}`}
        onClick={() => setLayer('actions')}
      >
        Akcije
        {upcomingActions > 0 ? <span>{upcomingActions}</span> : null}
      </button>
    </div>
  );
}
