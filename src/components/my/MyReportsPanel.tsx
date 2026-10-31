import { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Inbox, Pencil, RefreshCw, UserRound } from 'lucide-react';
import { CATEGORY_MAP } from '../../config';
import { formatRelativeTime } from '../../lib/format';
import { isFirebaseConfigured } from '../../services/firebase';
import { optimizedImageUrl } from '../../services/images';
import { useApp } from '../../state/app-context';
import type { Report } from '../../types';
import { Modal } from '../modals/Modal';
import { DeleteReportButton } from '../ui/DeleteReportButton';
import { EmptyState, Spinner } from '../ui/EmptyState';
import { ModerationBadge } from '../ui/ModerationBadge';
import { StatusBadge } from '../ui/StatusBadge';

type MyFilter = 'all' | 'pending' | 'published' | 'rejected' | 'resolved';

const FILTERS: { id: MyFilter; label: string; matches: (report: Report) => boolean }[] = [
  { id: 'all', label: 'Sve', matches: () => true },
  { id: 'pending', label: 'Na pregledu', matches: (report) => report.moderation === 'pending' },
  {
    id: 'published',
    label: 'Objavljene',
    matches: (report) => report.moderation === 'approved' && report.status !== 'resolved',
  },
  { id: 'rejected', label: 'Odbijene', matches: (report) => report.moderation === 'rejected' },
  {
    id: 'resolved',
    label: 'Rešene',
    matches: (report) => report.moderation === 'approved' && report.status === 'resolved',
  },
];

export function MyReportsPanel() {
  const {
    auth,
    myReports,
    reloadMyReports,
    selectReport,
    editReport,
    startCompose,
    closeModal,
    openModal,
  } = useApp();
  const [filter, setFilter] = useState<MyFilter>(() =>
    myReports.some((report) => report.moderation === 'rejected') ? 'rejected' : 'all',
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void reloadMyReports().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadMyReports]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((item) => [item.id, myReports.filter(item.matches).length]),
      ) as Record<MyFilter, number>,
    [myReports],
  );
  const matcher = FILTERS.find((item) => item.id === filter)?.matches ?? (() => true);
  const visible = myReports.filter(matcher);

  const open = (report: Report) => {
    closeModal();
    selectReport(report);
  };

  let body;
  if (!isFirebaseConfigured) {
    body = (
      <EmptyState
        icon={<UserRound size={20} />}
        title="Moje prijave rade uz nalog"
        description="U demo režimu nema naloga, pa se prijave ne vezuju za autora. Povežite Firebase da biste pratili svoje prijave."
      />
    );
  } else if (!auth.user) {
    body = (
      <EmptyState
        icon={<UserRound size={20} />}
        title="Prijavite se"
        description="Prijavite se Google nalogom da biste videli svoje prijave i njihov status."
        action={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => openModal({ kind: 'auth', intent: 'generic' })}
          >
            Prijava
          </button>
        }
      />
    );
  } else if (loading && myReports.length === 0) {
    body = (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje vaših prijava…
      </div>
    );
  } else if (myReports.length === 0) {
    body = (
      <EmptyState
        icon={<Inbox size={20} />}
        title="Još nemate prijava"
        description="Kada prijavite problem, ovde pratite da li je objavljen, da li treba nešto ispraviti i kada je rešen."
        action={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              closeModal();
              startCompose();
            }}
          >
            <FilePlus2 size={13} aria-hidden="true" /> Nova prijava
          </button>
        }
      />
    );
  } else {
    body = (
      <>
        <div className="my-reports__filters" role="group" aria-label="Filter po stanju">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip${filter === item.id ? ' is-active' : ''}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label} <span className="users__count">{counts[item.id]}</span>
            </button>
          ))}
          <button
            type="button"
            className="link-btn my-reports__refresh"
            onClick={() => {
              setLoading(true);
              void reloadMyReports().finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            {loading ? <Spinner size={12} /> : <RefreshCw size={12} aria-hidden="true" />} Osveži
          </button>
        </div>

        {visible.length === 0 ? (
          <p className="my-reports__empty">Nema prijava u ovom stanju.</p>
        ) : (
          <ul className="my-report-list">
            {visible.map((report) => (
              <li key={report.id} className={`my-report my-report--${report.moderation}`}>
                <button
                  type="button"
                  className="my-report__main"
                  onClick={() => open(report)}
                  aria-label={`Otvori prijavu: ${report.title}`}
                >
                  {report.imageUrls[0] ? (
                    <img src={optimizedImageUrl(report.imageUrls[0], 120)} alt="" loading="lazy" />
                  ) : (
                    <span className="review-item__noimg" aria-hidden="true" />
                  )}
                  <span className="my-report__body">
                    <strong>{report.title}</strong>
                    <span>
                      {CATEGORY_MAP[report.category].label} · poslato{' '}
                      {formatRelativeTime(report.createdAt)}
                    </span>
                  </span>
                </button>

                <div className="my-report__state">
                  {report.moderation === 'approved' ? (
                    <StatusBadge status={report.status} />
                  ) : (
                    <ModerationBadge state={report.moderation} />
                  )}
                  {report.editReview === 'pending' ? (
                    <span className="my-report__flag">Izmena čeka pregled</span>
                  ) : null}
                </div>

                {report.moderation === 'rejected' ? (
                  <div className="reject-note my-report__reason" role="note">
                    <p className="reject-note__title">Razlog moderatora</p>
                    <p className="reject-note__reason">
                      {report.rejectionReason ?? 'Moderator nije naveo razlog.'}
                    </p>
                  </div>
                ) : null}

                <div className="my-report__actions">
                  {report.moderation === 'rejected' ? (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => editReport(report)}
                    >
                      <Pencil size={12} aria-hidden="true" /> Ispravi i pošalji ponovo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--quiet btn--sm"
                      onClick={() => editReport(report)}
                    >
                      <Pencil size={12} aria-hidden="true" /> Izmeni
                    </button>
                  )}
                  <DeleteReportButton report={report} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <Modal
      title="Moje prijave"
      description="Stanje svakog vašeg problema: pregled, objava i rešavanje."
      size="lg"
      onClose={closeModal}
    >
      {body}
    </Modal>
  );
}
