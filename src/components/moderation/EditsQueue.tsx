import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Inbox, RefreshCw, TriangleAlert, Undo2 } from 'lucide-react';
import { CATEGORY_MAP } from '../../config';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { formatCoordinates, formatDateTime, formatDistance, formatRelativeTime } from '../../lib/format';
import { distanceInMeters } from '../../lib/geo';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { optimizedImageUrl } from '../../services/images';
import { fetchEditedReports } from '../../services/reports';
import { useApp } from '../../state/app-context';
import type { Report, ReportContent } from '../../types';
import { EmptyState, Spinner } from '../ui/EmptyState';

interface FieldChange {
  key: string;
  label: string;
  before: ReactNode;
  after: ReactNode;
}

function text(value: string | undefined): ReactNode {
  return value ? <span className="diff__text">{value}</span> : <em className="diff__empty">prazno</em>;
}

function thumbs(urls: string[]): ReactNode {
  if (urls.length === 0) return <em className="diff__empty">bez fotografija</em>;
  return (
    <span className="diff__thumbs">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">
          <img src={optimizedImageUrl(url, 160)} alt="" loading="lazy" />
        </a>
      ))}
    </span>
  );
}

/** Field-by-field differences between the approved and the edited content. */
function changesOf(before: ReportContent, after: ReportContent): FieldChange[] {
  const changes: FieldChange[] = [];
  const textFields: [keyof ReportContent & string, string][] = [
    ['title', 'Naslov'],
    ['description', 'Opis'],
    ['communityCan', 'Zajednica može sama'],
    ['helpNeeded', 'Potrebna pomoć'],
    ['address', 'Adresa'],
  ];

  for (const [key, label] of textFields) {
    const old = (before[key] as string | undefined) ?? '';
    const next = (after[key] as string | undefined) ?? '';
    if (old !== next) changes.push({ key, label, before: text(old), after: text(next) });
  }

  if (before.category !== after.category) {
    changes.push({
      key: 'category',
      label: 'Kategorija',
      before: text(CATEGORY_MAP[before.category].label),
      after: text(CATEGORY_MAP[after.category].label),
    });
  }

  if (before.latitude !== after.latitude || before.longitude !== after.longitude) {
    const moved = distanceInMeters(before, after);
    changes.push({
      key: 'location',
      label: `Lokacija · pomerena ${formatDistance(moved)}`,
      before: text(formatCoordinates(before.latitude, before.longitude)),
      after: text(formatCoordinates(after.latitude, after.longitude)),
    });
  }

  const sameImages =
    before.imageUrls.length === after.imageUrls.length &&
    before.imageUrls.every((url, index) => url === after.imageUrls[index]);
  if (!sameImages) {
    changes.push({
      key: 'imageUrls',
      label: 'Fotografije',
      before: thumbs(before.imageUrls),
      after: thumbs(after.imageUrls),
    });
  }

  return changes;
}

export function EditsQueue() {
  const { acceptReportEdit, revertReportEdit, refreshModerationCounts, selectReport, closeModal } =
    useApp();
  const isMobile = useIsMobile();

  const [items, setItems] = useState<Report[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'accept' | 'revert' | null>(null);
  const [mobilePane, setMobilePane] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await withTimeout(fetchEditedReports()));
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Izmene nisu učitane.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const index = items ? Math.max(0, items.findIndex((item) => item.id === activeId)) : 0;
  const active = items?.[index] ?? null;

  const decide = async (kind: 'accept' | 'revert') => {
    if (!items || !active) return;
    setBusy(kind);
    try {
      await (kind === 'accept' ? acceptReportEdit(active) : revertReportEdit(active));
      const rest = items.filter((item) => item.id !== active.id);
      setItems(rest);
      setActiveId(rest[Math.min(index, rest.length - 1)]?.id ?? null);
      if (rest.length === 0) setMobilePane(false);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(null);
    }
  };

  if (loading && !items) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje izmena…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Izmene nisu učitane"
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
        title="Nema izmena za pregled"
        description="Kada autor izmeni objavljenu prijavu, izmena je odmah javna i pojavljuje se ovde da je pogledate."
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

  const changes = active.previousVersion ? changesOf(active.previousVersion, active) : [];
  const showList = !isMobile || !mobilePane;
  const showPane = !isMobile || mobilePane;

  return (
    <div className="review">
      {showList ? (
        <div className="review__list">
          <div className="review__list-head">
            <span className="eyebrow">Izmenjene objavljene prijave</span>
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
                      {item.createdByName ?? 'član zajednice'} · izmenjeno{' '}
                      {item.editedAt ? formatRelativeTime(item.editedAt) : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showPane ? (
        <article className="review__pane" aria-label={`Izmena: ${active.title}`}>
          {isMobile ? (
            <button type="button" className="link-btn review__back" onClick={() => setMobilePane(false)}>
              <ArrowLeft size={13} aria-hidden="true" /> Sve izmene ({items.length})
            </button>
          ) : null}

          <div className="review__scroll">
            <h3 className="review__title">{active.title}</h3>
            <p className="detail-byline">
              {active.createdByName ?? 'član zajednice'}
              {active.editedAt ? ` · izmenjeno ${formatDateTime(active.editedAt)}` : ''}
            </p>
            <p className="diff__intro">
              Izmena je već javna. Prihvatite je ili vratite poslednju odobrenu verziju.
            </p>

            {!active.previousVersion ? (
              <div className="notice notice--warn">
                <TriangleAlert size={14} aria-hidden="true" />
                <p>Prethodna verzija nije sačuvana, pa razlike nije moguće prikazati.</p>
              </div>
            ) : changes.length === 0 ? (
              <p className="review__nophoto">Sadržaj je isti kao u odobrenoj verziji.</p>
            ) : (
              <dl className="diff">
                {changes.map((change) => (
                  <div key={change.key} className="diff__row">
                    <dt>{change.label}</dt>
                    <dd className="diff__before">
                      <span className="diff__tag">Bilo</span>
                      {change.before}
                    </dd>
                    <dd className="diff__after">
                      <span className="diff__tag">Sada</span>
                      {change.after}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

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
            <div className="review__decide">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => void decide('revert')}
                disabled={busy !== null || !active.previousVersion}
              >
                {busy === 'revert' ? <Spinner size={14} /> : <Undo2 size={14} aria-hidden="true" />}
                Vrati prethodnu
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void decide('accept')}
                disabled={busy !== null}
              >
                {busy === 'accept' ? <Spinner size={14} /> : <Check size={14} aria-hidden="true" />}
                Prihvati izmenu
              </button>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
