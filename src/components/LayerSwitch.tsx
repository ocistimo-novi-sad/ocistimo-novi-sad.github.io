import { useApp } from '../state/app-context';

/** Chooses what the map and the list show: reports or cleanup actions. */
export function LayerSwitch({ className }: { className?: string }) {
  const { layer, setLayer, reports, actions } = useApp();

  return (
    <div
      className={`segmented segmented--layer${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label="Šta prikazati"
    >
      <button
        type="button"
        role="tab"
        aria-selected={layer === 'reports'}
        className={`segmented__item${layer === 'reports' ? ' is-active' : ''}`}
        onClick={() => setLayer('reports')}
      >
        Prijave
        <span>{reports.length}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={layer === 'actions'}
        className={`segmented__item${layer === 'actions' ? ' is-active' : ''}`}
        onClick={() => setLayer('actions')}
      >
        Akcije
        <span>{actions.length}</span>
      </button>
    </div>
  );
}
