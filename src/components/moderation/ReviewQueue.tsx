import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Inbox,
  MapPin,
  Pencil,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react';
import { REJECT_REASONS } from '../../config';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { formatCoordinates, formatDateTime, formatRelativeTime } from '../../lib/format';
import { distanceInMeters, openStreetMapUrl } from '../../lib/geo';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { optimizedImageUrl } from '../../services/images';
import { fetchPendingReports } from '../../services/reports';
import { useApp } from '../../state/app-context';
import type { Report } from '../../types';
import { CategoryTag } from '../ui/CategoryGlyph';
import { DeleteReportButton } from '../ui/DeleteReportButton';
import { EmptyState, SectionLabel, Spinner } from '../ui/EmptyState';
import { ReportPlan } from '../ui/ReportPlan';
import { RejectForm } from './RejectForm';

/** Published reports this close to a pending one are shown as possible duplicates. */
const DUPLICATE_RADIUS_M = 50;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function ReviewQueue() {
  const {
    reports,
    approvePendingReport,
    rejectPendingReport,
    refreshModerationCounts,
    selectReport,
    editReport,
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
      setItems(await withTimeout(fetchPendingReports()));
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Prijave za pregled nisu učitane.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const index = items ? Math.max(0, items.findIndex((item) => item.id === activeId)) : 0;
  const active = items?.[index] ?? null;

  const duplicates = useMemo(() => {
    if (!active) return [];
    return reports.filter(
      (report) =>
        report.id !== active.id && distanceInMeters(report, active) <= DUPLICATE_RADIUS_M,
    );
  }, [active, reports]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (!items || items.length === 0) return;
      const clamped = Math.min(items.length - 1, Math.max(0, nextIndex));
      setActiveId(items[clamped].id);
      setRejecting(false);
    },
    [items],
  );

  /** Drops a decided report and opens the one that took its place. */
  const removeActive = useCallback(() => {
    if (!items || !active) return;
    const rest = items.filter((item) => item.id !== active.id);
    setItems(rest);
    setActiveId(rest[Math.min(index, rest.length - 1)]?.id ?? null);
    setRejecting(false);
    if (rest.length === 0) setMobilePane(false);
  }, [active, index, items]);

  const approve = useCallback(async () => {
    if (!active || busy) return;
    setBusy(true);
    try {
      await approvePendingReport(active);
      removeActive();
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  }, [active, approvePendingReport, busy, removeActive]);

  const reject = async (reason: string) => {
    if (!active) return;
    setBusy(true);
    try {
      await rejectPendingReport(active, reason);
      removeActive();
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  // Keyboard flow for moderators working through a long queue.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (rejecting || busy || isTyping(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        goTo(index + 1);
      } else if (key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        goTo(index - 1);
      } else if (key === 'a') {
        event.preventDefault();
        void approve();
      } else if (key === 'r' && active) {
        event.preventDefault();
        setRejecting(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, approve, busy, goTo, index, rejecting]);

  if (loading && !items) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje prijava za pregled…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Prijave za pregled nisu učitane"
        description={error}
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  if (!items || items.length === 0 || !active) {
    return (
      <EmptyState
        icon={<Inbox size={20} />}
        title="Sve je pregledano"
        description="Nema novih prijava koje čekaju odobrenje. Nove prijave se pojavljuju ovde pre objave na mapi."
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

  const showList = !isMobile || !mobilePane;
  const showPane = !isMobile || mobilePane;

  return (
    <div className="review">
      {showList ? (
        <div className="review__list">
          <div className="review__list-head">
            <span className="eyebrow">Čeka pregled · najstarije prvo</span>
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
            {items.map((item) => (
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
                  {item.imageUrls[0] ? (
                    <img src={optimizedImageUrl(item.imageUrls[0], 120)} alt="" loading="lazy" />
                  ) : (
                    <span className="review-item__noimg" aria-hidden="true" />
                  )}
                  <span className="review-item__body">
                    <strong>{item.title}</strong>
                    <span>
                      {item.createdByName ?? 'član zajednice'} · {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!isMobile ? (
            <p className="review__keys" aria-hidden="true">
              <kbd>J</kbd>/<kbd>K</kbd> sledeća/prethodna · <kbd>A</kbd> odobri · <kbd>R</kbd> odbij
            </p>
          ) : null}
        </div>
      ) : null}

      {showPane ? (
        <article className="review__pane" aria-label={`Pregled: ${active.title}`}>
          {isMobile ? (
            <button type="button" className="link-btn review__back" onClick={() => setMobilePane(false)}>
              <ArrowLeft size={13} aria-hidden="true" /> Sve prijave ({items.length})
            </button>
          ) : null}

          <div className="review__scroll">
            <div className="detail-tags">
              <CategoryTag category={active.category} />
              <span className="review__position">
                {index + 1} / {items.length}
              </span>
            </div>
            <h3 className="review__title">{active.title}</h3>
            <p className="detail-byline">
              {active.createdByName ?? 'član zajednice'} · {formatDateTime(active.createdAt)}
            </p>

            {active.imageUrls.length > 0 ? (
              <div className="review__photos">
                {active.imageUrls.map((url, photoIndex) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={optimizedImageUrl(url, 600)}
                      alt={`Fotografija ${photoIndex + 1}`}
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="review__nophoto">Prijava nema fotografiju.</p>
            )}

            {duplicates.length > 0 ? (
              <div className="notice notice--warn">
                <TriangleAlert size={14} aria-hidden="true" />
                <p>
                  Moguć duplikat: na manje od {DUPLICATE_RADIUS_M} m već{' '}
                  {duplicates.length === 1 ? 'postoji objavljena prijava' : `postoje ${duplicates.length} objavljene prijave`}
                  : {duplicates.slice(0, 3).map((report) => `„${report.title}”`).join(', ')}.
                </p>
              </div>
            ) : null}

            <section className="detail-section">
              <SectionLabel>Opis</SectionLabel>
              <p className="detail-prose">{active.description}</p>
            </section>

            <ReportPlan report={active} />

            <section className="detail-section">
              <SectionLabel>Lokacija</SectionLabel>
              <div className="location-box">
                <div className="location-box__head">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{active.address ?? 'Novi Sad'}</span>
                </div>
                <code className="location-box__coords">
                  {formatCoordinates(active.latitude, active.longitude)}
                </code>
                <div className="location-box__actions">
                  <a
                    className="btn btn--quiet btn--sm"
                    href={openStreetMapUrl(active)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={13} aria-hidden="true" /> OpenStreetMap
                  </a>
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
              </div>
            </section>
          </div>

          <div className="review__bar">
            {rejecting ? (
              <RejectForm
                heading={`Odbij prijavu „${active.title}”`}
                presets={REJECT_REASONS}
                busy={busy}
                onCancel={() => setRejecting(false)}
                onSubmit={(reason) => void reject(reason)}
              />
            ) : (
              <div className="review__decide">
                <div className="review__manage">
                  <DeleteReportButton key={active.id} report={active} onDeleted={removeActive} />
                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => editReport(active)}
                    disabled={busy}
                  >
                    <Pencil size={12} aria-hidden="true" /> Izmeni
                  </button>
                </div>
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
                  onClick={() => void approve()}
                  disabled={busy}
                >
                  {busy ? <Spinner size={14} /> : <Check size={14} aria-hidden="true" />}
                  Odobri i objavi
                </button>
              </div>
            )}
          </div>
        </article>
      ) : null}
    </div>
  );
}
