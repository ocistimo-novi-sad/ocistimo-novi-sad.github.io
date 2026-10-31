import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Inbox, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { RESOLUTION_REJECT_REASONS } from '../../config';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { formatDateTime, formatRelativeTime } from '../../lib/format';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { optimizedImageUrl } from '../../services/images';
import { fetchPendingResolutions } from '../../services/reports';
import { useApp } from '../../state/app-context';
import type { Report } from '../../types';
import { BeforeAfter } from '../ui/BeforeAfter';
import { EmptyState, SectionLabel, Spinner } from '../ui/EmptyState';
import { RejectForm } from './RejectForm';

export function ResolutionsQueue() {
  const {
    approveReportResolution,
    rejectReportResolution,
    refreshModerationCounts,
    selectReport,
    closeModal,
  } = useApp();
  const isMobile = useIsMobile();

  const [items, setItems] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mobilePane, setMobilePane] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await withTimeout(fetchPendingResolutions()));
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Sanacije nisu učitane.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const index = items ? Math.max(0, items.findIndex((item) => item.id === activeId)) : 0;
  const active = items?.[index] ?? null;

  const decide = async (task: () => Promise<void>) => {
    if (!items || !active) return;
    setBusy(true);
    try {
      await task();
      const rest = items.filter((item) => item.id !== active.id);
      setItems(rest);
      setActiveId(rest[Math.min(index, rest.length - 1)]?.id ?? null);
      setRejecting(false);
      if (rest.length === 0) setMobilePane(false);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  if (loading && !items) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje sanacija…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Sanacije nisu učitane"
        description={error}
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  if (!items || items.length === 0 || !active || !active.resolution) {
    return (
      <EmptyState
        icon={<Inbox size={20} />}
        title="Nema sanacija za potvrdu"
        description="Kada autor javi da je problem rešen i pošalje fotografiju, pojaviće se ovde."
        action={
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => {
              void load();
              void refreshModerationCounts();
            }}
          >
            <RefreshCw size={13} aria-hidden="true" /> Osveži
          </button>
        }
      />
    );
  }

  const resolution = active.resolution;
  const showList = !isMobile || !mobilePane;
  const showPane = !isMobile || mobilePane;

  return (
    <div className="review">
      {showList ? (
        <div className="review__list">
          <div className="review__list-head">
            <span className="eyebrow">Čeka potvrdu · najstarije prvo</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={12} aria-hidden="true" /> Osveži
            </button>
          </div>
          <ul className="review-items">
            {items.map((item) => {
              const thumb = item.resolution?.imageUrls[0];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`review-item${item.id === active.id ? ' is-active' : ''}`}
                    aria-current={item.id === active.id ? 'true' : undefined}
                    onClick={() => {
                      setActiveId(item.id);
                      setRejecting(false);
                      setMobilePane(true);
                    }}
                  >
                    {thumb ? (
                      <img src={optimizedImageUrl(thumb, 120)} alt="" loading="lazy" />
                    ) : (
                      <span className="review-item__noimg" aria-hidden="true" />
                    )}
                    <span className="review-item__body">
                      <strong>{item.title}</strong>
                      <span>
                        {item.createdByName ?? 'član zajednice'}
                        {item.resolution?.submittedAt
                          ? ` · ${formatRelativeTime(item.resolution.submittedAt)}`
                          : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showPane ? (
        <article className="review__pane" aria-label={`Sanacija: ${active.title}`}>
          {isMobile ? (
            <button type="button" className="link-btn review__back" onClick={() => setMobilePane(false)}>
              <ArrowLeft size={13} aria-hidden="true" /> Sve sanacije ({items.length})
            </button>
          ) : null}

          <div className="review__scroll">
            <h3 className="review__title">{active.title}</h3>
            <p className="detail-byline">
              {active.createdByName ?? 'član zajednice'}
              {resolution.submittedAt
                ? ` · sanacija prijavljena ${formatDateTime(resolution.submittedAt)}`
                : ''}
            </p>

            <BeforeAfter before={active.imageUrls} after={resolution.imageUrls} />

            {resolution.imageUrls.length > 1 ? (
              <div className="review__photos">
                {resolution.imageUrls.map((url, photoIndex) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={optimizedImageUrl(url, 400)}
                      alt={`Posle, fotografija ${photoIndex + 1}`}
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : null}

            {resolution.note ? (
              <section className="detail-section">
                <SectionLabel>Napomena autora</SectionLabel>
                <p className="detail-prose">{resolution.note}</p>
              </section>
            ) : null}

            <section className="detail-section">
              <SectionLabel>Opis problema</SectionLabel>
              <p className="detail-prose">{active.description}</p>
            </section>

            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => {
                selectReport(active);
                closeModal();
              }}
            >
              Otvori na mapi
            </button>
          </div>

          <div className="review__bar">
            {rejecting ? (
              <RejectForm
                heading="Sanacija nije potvrđena"
                presets={RESOLUTION_REJECT_REASONS}
                busy={busy}
                onCancel={() => setRejecting(false)}
                onSubmit={(reason) => void decide(() => rejectReportResolution(active, reason))}
              />
            ) : (
              <div className="review__decide">
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => setRejecting(true)}
                  disabled={busy}
                >
                  <X size={14} aria-hidden="true" /> Odbij…
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void decide(() => approveReportResolution(active))}
                  disabled={busy}
                >
                  {busy ? <Spinner size={14} /> : <Check size={14} aria-hidden="true" />}
                  Potvrdi sanaciju
                </button>
              </div>
            )}
          </div>
        </article>
      ) : null}
    </div>
  );
}
