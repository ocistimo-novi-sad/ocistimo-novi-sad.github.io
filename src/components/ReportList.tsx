import { useEffect, useState } from 'react';
import {
  ChevronRight,
  Image as ImageIcon,
  Inbox,
  Plus,
  RefreshCw,
  SearchX,
  TriangleAlert,
} from 'lucide-react';
import { CATEGORY_MAP, STATUS_MAP } from '../config';
import { formatRelativeTime } from '../lib/format';
import { optimizedImageUrl } from '../services/images';
import { useApp } from '../state/app-context';
import type { Report } from '../types';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { EmptyState, Spinner } from './ui/EmptyState';
import { StatusDot } from './ui/StatusBadge';

function shortPlace(report: Report): string {
  if (!report.address) return 'Novi Sad';
  return report.address.split(',')[0]?.trim() || 'Novi Sad';
}

function ReportCard({
  report,
  selected,
}: {
  report: Report;
  selected: boolean;
}) {
  const { selectReport } = useApp();
  const [imageFailed, setImageFailed] = useState(false);
  const image = report.imageUrls[0];
  const hasImage = Boolean(image) && !imageFailed;

  return (
    <button
      type="button"
      id={`report-card-${report.id}`}
      className={`report-card${selected ? ' is-selected' : ''}`}
      data-category={report.category}
      onClick={() => selectReport(report)}
      aria-pressed={selected}
    >
      <span className="report-card__media" data-category={report.category}>
        {hasImage ? (
          <img
            src={optimizedImageUrl(image, 160)}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <CategoryGlyph category={report.category} size={16} />
        )}
      </span>

      <span className="report-card__body">
        <span className="report-card__top">
          <span className="report-card__category">{CATEGORY_MAP[report.category].shortLabel}</span>
          <span className="report-card__time">{formatRelativeTime(report.createdAt)}</span>
        </span>
        <span className="report-card__title">{report.title}</span>
        <span className="report-card__bottom">
          <span className="report-card__status">
            <StatusDot status={report.status} />
            {STATUS_MAP[report.status].label}
          </span>
          <span className="dot-sep" aria-hidden="true">
            ·
          </span>
          <span className="report-card__place">{shortPlace(report)}</span>
          {report.imageUrls.length > 1 ? (
            <span className="report-card__photos">
              <ImageIcon size={11} aria-hidden="true" />
              {report.imageUrls.length}
            </span>
          ) : null}
        </span>
      </span>

      <span className="report-card__chevron" aria-hidden="true">
        <ChevronRight size={14} />
      </span>
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="list-skeleton" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton skeleton--thumb" />
          <span className="skeleton-row__lines">
            <span className="skeleton skeleton--short" />
            <span className="skeleton skeleton--long" />
            <span className="skeleton skeleton--medium" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportList() {
  const {
    filteredReports,
    reports,
    reportsPhase,
    reportsError,
    selectedReport,
    resetFilters,
    startCompose,
    reloadReports,
  } = useApp();

  useEffect(() => {
    if (!selectedReport) return;
    const element = document.getElementById(`report-card-${selectedReport.id}`);
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedReport]);

  if (reportsPhase === 'loading' && reports.length === 0) {
    return <ListSkeleton />;
  }

  if (reportsPhase === 'error' && reports.length === 0) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Prijave nisu učitane"
        description={reportsError ?? 'Proverite internet vezu i pokušajte ponovo.'}
        action={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void reloadReports()}
          >
            <RefreshCw size={14} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={20} />}
        title="Još nema prijava"
        description="Prijavite prvi problem u svom kvartu. Prijava je javna i pomaže komšijama da je pronađu."
        action={
          <button type="button" className="btn btn--primary btn--sm" onClick={startCompose}>
            <Plus size={14} aria-hidden="true" /> Prijavi problem
          </button>
        }
      />
    );
  }

  if (filteredReports.length === 0) {
    return (
      <EmptyState
        icon={<SearchX size={20} />}
        title="Nema rezultata"
        description="Nijedna prijava ne odgovara pretrazi i filterima. Pokušajte sa drugim pojmom ili očistite filtere."
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={resetFilters}>
            Očisti filtere
          </button>
        }
      />
    );
  }

  return (
    <ul className="report-list">
      {filteredReports.map((report) => (
        <li key={report.id}>
          <ReportCard report={report} selected={selectedReport?.id === report.id} />
        </li>
      ))}
    </ul>
  );
}

export function LoadMoreButton() {
  const { hasMoreReports, loadingMoreReports, loadMoreReports } = useApp();
  if (!hasMoreReports) return null;

  return (
    <div className="load-more">
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => void loadMoreReports()}
        disabled={loadingMoreReports}
      >
        {loadingMoreReports ? <Spinner size={14} /> : null}
        {loadingMoreReports ? 'Učitavanje…' : 'Učitaj još prijava'}
      </button>
    </div>
  );
}
