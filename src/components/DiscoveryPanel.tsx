import { Info, RefreshCw } from 'lucide-react';
import { formatReportCount } from '../lib/format';
import { isFirebaseConfigured } from '../services/firebase';
import { useApp } from '../state/app-context';
import { FiltersBar } from './FiltersBar';
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
  } = useApp();

  return (
    <section className="panel" aria-label="Prijave u Novom Sadu">
      <div className="panel__head">
        <div className="panel__eyebrow-row">
          <span className="eyebrow">Novi Sad · Prijave</span>
          <span className="panel__count" title="Ukupan broj učitanih prijava">
            {reports.length}
          </span>
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
        </div>

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
        <div className="panel__list-head">
          <span className="eyebrow">Rezultati</span>
          <span className="panel__list-count">
            {filteredReports.length === reports.length
              ? formatReportCount(reports.length)
              : `${filteredReports.length} od ${reports.length}`}
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
