import { Info, RefreshCw } from 'lucide-react';
import { DEFAULT_FILTERS } from '../config';
import { formatReportCount } from '../lib/format';
import { isFirebaseConfigured } from '../services/firebase';
import { useApp } from '../state/app-context';
import { FiltersBar } from './FiltersBar';
import { ImpactSummary } from './ImpactSummary';
import { LayerSwitch } from './LayerSwitch';
import { NearMeButton } from './NearMeButton';
import { LoadMoreButton, ReportList } from './ReportList';

export function DiscoveryPanel() {
  const {
    reports,
    filteredReports,
    selectedReport,
    reloadReports,
    reportsPhase,
    openModal,
    startCompose,
    resetFilters,
    filters,
    setSort,
  } = useApp();
  const narrowed = filteredReports.length !== reports.length;
  // Any filter that is on, even one that happens to match every report.
  const filtered =
    narrowed ||
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.viewportOnly ||
    filters.query.trim() !== '';

  return (
    <section className="panel" aria-label="Prijave u Novom Sadu">
      <div className="panel__head">
        <LayerSwitch />

        {!isFirebaseConfigured ? (
          <div className="demo-note">
            <Info size={14} aria-hidden="true" />
            <p>
              Demo režim: prijave ostaju u ovom pregledaču.
            </p>
            <button type="button" onClick={() => openModal({ kind: 'info' })}>
              Detalji
            </button>
          </div>
        ) : null}

        <FiltersBar />
      </div>

      <div className="panel__scroll">
        <ImpactSummary />

        <div className="panel__list-head">
          <NearMeButton
            active={filters.sort === 'nearest'}
            onToggle={(on) => setSort(on ? 'nearest' : DEFAULT_FILTERS.sort)}
          />
          <span className="panel__list-tools">
            <span className="panel__list-count">
              {narrowed
                ? `${filteredReports.length} od ${reports.length}`
                : formatReportCount(reports.length)}
            </span>
            {filtered ? (
              <button type="button" className="link-btn" onClick={resetFilters}>
                Očisti
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn icon-btn--ghost"
              onClick={() => void reloadReports()}
              aria-label="Osveži prijave"
              title="Osveži prijave"
              disabled={reportsPhase === 'loading'}
            >
              <RefreshCw
                size={14}
                aria-hidden="true"
                className={reportsPhase === 'loading' ? 'spinner' : undefined}
              />
            </button>
          </span>
        </div>

        <ReportList />
        <LoadMoreButton />

        {selectedReport ? <div className="panel__scroll-pad" /> : null}
      </div>

      <div className="panel__foot">
        <span>Prijava je javna. Fotografije i opis vidljivi su svima.</span>
        <button type="button" className="link-btn" onClick={startCompose}>
          Prijavi problem
        </button>
      </div>
    </section>
  );
}
