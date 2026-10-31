import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  Pencil,
  ShieldCheck,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import { APP, REJECT_REASONS, REPORT_STATUSES, RESOLUTION_REJECT_REASONS } from '../config';
import {
  formatCoordinates,
  formatDate,
  formatDateTime,
  formatTime,
  formatWeekday,
} from '../lib/format';
import { openStreetMapUrl } from '../lib/geo';
import { useApp } from '../state/app-context';
import { Drawer } from './Drawer';
import { PhotoGallery } from './PhotoGallery';
import { imagesEnabled } from '../services/images';
import { CategoryTag } from './ui/CategoryGlyph';
import { ActionStatusBadge } from './ui/ActionStatusBadge';
import { SectionLabel, Spinner } from './ui/EmptyState';
import { BeforeAfter } from './ui/BeforeAfter';
import { DeleteReportButton } from './ui/DeleteReportButton';
import { ModerationBadge } from './ui/ModerationBadge';
import { ReportPlan } from './ui/ReportPlan';
import { StatusBadge } from './ui/StatusBadge';
import { RejectForm } from './moderation/RejectForm';
import type { Report, ReportStatus } from '../types';

/** Confirm or reject the author's proof that the problem was fixed. */
function ResolutionReviewBox({ report }: { report: Report }) {
  const { approveReportResolution, rejectReportResolution } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      setRejecting(false);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-box">
      <p className="admin-box__title">
        <ShieldCheck size={14} aria-hidden="true" />
        Sanacija čeka potvrdu
      </p>
      {rejecting ? (
        <RejectForm
          heading="Sanacija nije potvrđena"
          presets={RESOLUTION_REJECT_REASONS}
          busy={busy}
          onCancel={() => setRejecting(false)}
          onSubmit={(reason) => void run(() => rejectReportResolution(report, reason))}
        />
      ) : (
        <div className="admin-box__row">
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => setRejecting(true)}
            disabled={busy}
          >
            <X size={13} aria-hidden="true" /> Odbij…
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void run(() => approveReportResolution(report))}
            disabled={busy}
          >
            {busy ? <Spinner size={13} /> : <Check size={13} aria-hidden="true" />}
            Potvrdi sanaciju
          </button>
        </div>
      )}
    </div>
  );
}

/** Moderator shortcut: resolved without waiting for the author's proof. */
function MarkResolvedButton({ report }: { report: Report }) {
  const { markReportResolved } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="btn btn--quiet btn--sm" onClick={() => setConfirming(true)}>
        <CheckCircle2 size={12} aria-hidden="true" /> Označi kao rešeno
      </button>
    );
  }

  return (
    <span className="delete-confirm" role="group" aria-label="Potvrda">
      <span className="delete-confirm__text delete-confirm__text--ok">Rešeno bez dokaza?</span>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => {
          setBusy(true);
          void markReportResolved(report)
            .catch(() => {
              // The provider already surfaced the error.
            })
            .finally(() => {
              setBusy(false);
              setConfirming(false);
            });
        }}
        disabled={busy}
      >
        {busy ? <Spinner size={12} /> : <Check size={12} aria-hidden="true" />}
        Da
      </button>
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Ne
      </button>
    </span>
  );
}

/** Accept or roll back an author's edit of a published report. */
function EditReviewBox({ report }: { report: Report }) {
  const { acceptReportEdit, revertReportEdit } = useApp();
  const [busy, setBusy] = useState<'accept' | 'revert' | null>(null);

  const run = async (kind: 'accept' | 'revert') => {
    setBusy(kind);
    try {
      await (kind === 'accept' ? acceptReportEdit(report) : revertReportEdit(report));
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-box">
      <p className="admin-box__title">
        <ShieldCheck size={14} aria-hidden="true" />
        Izmena autora
      </p>
      <div className="admin-box__row">
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={() => void run('revert')}
          disabled={busy !== null || !report.previousVersion}
        >
          {busy === 'revert' ? <Spinner size={13} /> : <Undo2 size={13} aria-hidden="true" />}
          Vrati prethodnu
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void run('accept')}
          disabled={busy !== null}
        >
          {busy === 'accept' ? <Spinner size={13} /> : <Check size={13} aria-hidden="true" />}
          Prihvati izmenu
        </button>
      </div>
      <p className="admin-box__hint">
        Razlike po poljima vidite u Moderaciji, na tabu „Izmene”.
      </p>
    </div>
  );
}

/** Approve or reject a report that is not public yet. */
function ModerationDecisionBox({ report }: { report: Report }) {
  const { approvePendingReport, rejectPendingReport } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      setRejecting(false);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-box">
      <p className="admin-box__title">
        <ShieldCheck size={14} aria-hidden="true" />
        Moderacija
      </p>
      {rejecting ? (
        <RejectForm
          heading={
            report.moderation === 'rejected' ? 'Promeni razlog odbijanja' : 'Odbij prijavu'
          }
          presets={REJECT_REASONS}
          busy={busy}
          onCancel={() => setRejecting(false)}
          onSubmit={(reason) => void run(() => rejectPendingReport(report, reason))}
        />
      ) : (
        <>
          <div className="admin-box__row">
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => setRejecting(true)}
              disabled={busy}
            >
              <X size={13} aria-hidden="true" />
              {report.moderation === 'rejected' ? 'Promeni razlog' : 'Odbij…'}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void run(() => approvePendingReport(report))}
              disabled={busy}
            >
              {busy ? <Spinner size={13} /> : <Check size={13} aria-hidden="true" />}
              Odobri i objavi
            </button>
          </div>
          <p className="admin-box__hint">
            Odobrena prijava odmah postaje vidljiva svima na mapi.
          </p>
        </>
      )}
    </div>
  );
}

function AdminStatusBox({
  currentStatus,
  saving,
  value,
  onChange,
  onSave,
}: {
  currentStatus: ReportStatus;
  saving: boolean;
  value: ReportStatus;
  onChange: (status: ReportStatus) => void;
  onSave: () => void;
}) {
  return (
    <div className="admin-box">
      <p className="admin-box__title">
        <ShieldCheck size={14} aria-hidden="true" />
        Moderacija
      </p>
      <div className="admin-box__row">
        <label className="select-field select-field--wide">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as ReportStatus)}
            aria-label="Novi status prijave"
          >
            {REPORT_STATUSES.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onSave}
          disabled={saving || value === currentStatus}
        >
          {saving ? <Spinner size={14} /> : 'Sačuvaj'}
        </button>
      </div>
      <p className="admin-box__hint">
        Promena se beleži uz vaš nalog i vreme izmene. Status menjajte tek kada je proveren.
      </p>
    </div>
  );
}

export function ReportDetail() {
  const {
    selectedReport: report,
    relatedAction,
    closeSelection,
    requestFlag,
    auth,
    moderateReport,
    editReport,
    openModal,
    selectAction,
    showReportOnMap,
    notify,
  } = useApp();

  const [adminStatus, setAdminStatus] = useState<ReportStatus>('new');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (report) setAdminStatus(report.status);
    setCopied(false);
  }, [report?.id, report?.status, report]);

  if (!report) return null;

  const published = report.moderation === 'approved';
  const isOwner = report.source === 'firestore' && auth.user?.uid === report.createdBy;
  const canManage = isOwner || (auth.isModerator && report.source === 'firestore');
  const resolved = report.status === 'resolved';
  const resolution = report.resolution;
  const resolutionPending = published && !resolved && resolution?.state === 'pending';
  const canReportFixed =
    isOwner && published && !resolved && !resolutionPending && imagesEnabled;
  const resolvedOn = resolution?.reviewedAt ?? (resolved ? report.moderatedAt : null);
  const moderatedLine =
    report.moderatedByName && report.moderatedAt
      ? `${published ? 'Odobrio' : 'Pregledao'}: ${report.moderatedByName} · ${formatDateTime(report.moderatedAt)}`
      : null;

  const copyCoordinates = async () => {
    const text = formatCoordinates(report.latitude, report.longitude);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      notify('error', 'Kopiranje nije uspelo. Označite koordinate ručno.');
    }
  };

  const saveStatus = async () => {
    setSaving(true);
    try {
      await moderateReport(report.id, adminStatus);
    } catch {
      // The provider already surfaced the error.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      label={`Prijava: ${report.title}`}
      onClose={closeSelection}
      footer={
        <div className="detail-foot">
          {published ? (
            <button
              type="button"
              className="link-btn link-btn--muted"
              onClick={() => requestFlag(report.id)}
            >
              <Flag size={13} aria-hidden="true" />
              Prijavi sadržaj
            </button>
          ) : (
            <span className="detail-foot__hint">Nije javno</span>
          )}
          <span className="detail-foot__hint">Prijava zajednice</span>
        </div>
      }
    >
      {isOwner ? (
        <div className="owner-bar">
          <span className="owner-bar__label">
            <UserRound size={13} aria-hidden="true" /> Vaša prijava
          </span>
          <div className="owner-bar__actions">
            {canReportFixed ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => openModal({ kind: 'resolve', reportId: report.id })}
              >
                <CheckCircle2 size={12} aria-hidden="true" /> Sanirano
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => editReport(report)}
            >
              <Pencil size={12} aria-hidden="true" /> Izmeni
            </button>
            <DeleteReportButton report={report} />
          </div>
        </div>
      ) : null}

      <div className="detail-head">
        <div className="detail-tags">
          <CategoryTag category={report.category} />
          {published ? (
            <StatusBadge status={report.status} />
          ) : (
            <ModerationBadge state={report.moderation} />
          )}
        </div>
      </div>

      {report.moderation === 'pending' ? (
        <div className="notice notice--warn">
          <ShieldCheck size={14} aria-hidden="true" />
          <p>Prijava čeka pregled moderatora. Do objave je vide samo autor i moderatori.</p>
        </div>
      ) : null}

      {report.moderation === 'rejected' ? (
        <div className="reject-note" role="note">
          <p className="reject-note__title">Prijava nije objavljena</p>
          <p className="reject-note__reason">
            {report.rejectionReason ?? 'Moderator nije naveo razlog.'}
          </p>
          {isOwner ? (
            <button
              type="button"
              className="btn btn--primary btn--sm reject-note__action"
              onClick={() => editReport(report)}
            >
              <Pencil size={12} aria-hidden="true" /> Ispravi i pošalji ponovo
            </button>
          ) : null}
        </div>
      ) : null}

      {published && report.editReview === 'pending' && (isOwner || auth.isModerator) ? (
        <div className="notice notice--info">
          <Pencil size={14} aria-hidden="true" />
          <p>
            {isOwner
              ? 'Vaša izmena je vidljiva svima. Moderator će je pregledati.'
              : 'Autor je izmenio objavljenu prijavu. Izmena čeka pregled u Moderaciji.'}
          </p>
        </div>
      ) : null}

      <h2 className="detail-title">{report.title}</h2>

      <p className="detail-byline">
        Autor prijave: {report.createdByName ?? 'član zajednice'} ·{' '}
        {formatDateTime(report.createdAt)}
        {published && report.editedAt ? ' · izmenjeno' : null}
        {report.source === 'demo' ? <span className="demo-pill">demo</span> : null}
      </p>

      {resolved ? (
        <div className="resolved-banner" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <p>
            <strong>Rešeno{resolvedOn ? ` ${formatDate(resolvedOn)}` : ''}</strong> · hvala
            zajednici
          </p>
        </div>
      ) : null}

      {resolutionPending ? (
        <div className="resolution-strip" role="status">
          <Clock3 size={14} aria-hidden="true" />
          <p>
            {isOwner
              ? 'Poslali ste dokaz sanacije. Moderator će ga pogledati i potvrditi.'
              : 'Prijavljena sanacija, čeka potvrdu moderatora.'}
          </p>
        </div>
      ) : null}

      {isOwner && !resolved && resolution?.state === 'rejected' ? (
        <div className="reject-note" role="note">
          <p className="reject-note__title">Sanacija nije potvrđena</p>
          <p className="reject-note__reason">
            {resolution.rejectionReason ?? 'Moderator nije naveo razlog.'}
          </p>
          {canReportFixed ? (
            <button
              type="button"
              className="btn btn--primary btn--sm reject-note__action"
              onClick={() => openModal({ kind: 'resolve', reportId: report.id })}
            >
              <CheckCircle2 size={12} aria-hidden="true" /> Pošalji novi dokaz
            </button>
          ) : null}
        </div>
      ) : null}

      {resolved && resolution && resolution.imageUrls.length > 0 ? (
        <section className="detail-section">
          <SectionLabel>Pre i posle</SectionLabel>
          <BeforeAfter
            before={report.imageUrls}
            after={resolution.imageUrls}
            onOpen={(images, index) => openModal({ kind: 'lightbox', images, index })}
          />
          {resolution.note ? <p className="detail-prose resolution-note">{resolution.note}</p> : null}
        </section>
      ) : (
        <PhotoGallery
          images={report.imageUrls}
          onOpen={(index) =>
            openModal({ kind: 'lightbox', images: report.imageUrls, index })
          }
        />
      )}

      {auth.isModerator && resolutionPending && resolution ? (
        <section className="detail-section">
          <SectionLabel>Dokaz sanacije</SectionLabel>
          <BeforeAfter
            before={report.imageUrls}
            after={resolution.imageUrls}
            onOpen={(images, index) => openModal({ kind: 'lightbox', images, index })}
          />
          {resolution.note ? <p className="detail-prose resolution-note">{resolution.note}</p> : null}
        </section>
      ) : null}

      <section className="detail-section">
        <SectionLabel>Opis</SectionLabel>
        <p className="detail-prose">{report.description}</p>
      </section>

      <ReportPlan report={report} />

      <section className="detail-section">
        <SectionLabel>Lokacija</SectionLabel>
        <div className="location-box">
          <div className="location-box__head">
            <MapPin size={14} aria-hidden="true" />
            <span>{report.address ?? 'Novi Sad'}</span>
          </div>
          <code className="location-box__coords">
            {formatCoordinates(report.latitude, report.longitude)}
          </code>
          <div className="location-box__actions">
            <a
              className="btn btn--quiet btn--sm"
              href={openStreetMapUrl(report)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} aria-hidden="true" /> OpenStreetMap
            </a>
            <button type="button" className="btn btn--quiet btn--sm" onClick={copyCoordinates}>
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {copied ? 'Kopirano' : 'Kopiraj koordinate'}
            </button>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => showReportOnMap(report)}
            >
              Prikaži na mapi
            </button>
          </div>
        </div>
      </section>

      {relatedAction ? (
        <section className="detail-section">
          <SectionLabel>Povezana akcija</SectionLabel>
          <button
            type="button"
            className="related-action"
            onClick={() => selectAction(relatedAction)}
          >
            <span className="related-action__top">
              <span className="related-action__eyebrow">Akcija čišćenja</span>
              <ActionStatusBadge status={relatedAction.status} />
            </span>
            <strong>{relatedAction.title}</strong>
            <span className="related-action__meta">
              <CalendarDays size={12} aria-hidden="true" />
              {formatWeekday(relatedAction.date)}, {formatDate(relatedAction.date)} u{' '}
              {formatTime(relatedAction.date)}
            </span>
            <span className="related-action__meta">
              <MapPin size={12} aria-hidden="true" />
              {relatedAction.meetingPoint}
            </span>
            <span className="related-action__link">
              Pogledaj akciju <ArrowUpRight size={13} aria-hidden="true" />
            </span>
          </button>
        </section>
      ) : null}

      <p className="detail-note">
        Ovo je prijava iz zajednice. Status „Nova” znači da problem još nije proveren, a ne da je
        rešen. Za tačnost opisa odgovoran je autor prijave.
      </p>

      {auth.isModerator && report.source === 'firestore' ? (
        published ? (
          <AdminStatusBox
            currentStatus={report.status}
            saving={saving}
            value={adminStatus}
            onChange={setAdminStatus}
            onSave={() => void saveStatus()}
          />
        ) : (
          <ModerationDecisionBox key={report.id} report={report} />
        )
      ) : null}

      {auth.isModerator && published && report.editReview === 'pending' ? (
        <EditReviewBox key={`edit-${report.id}`} report={report} />
      ) : null}

      {auth.isModerator && resolutionPending ? (
        <ResolutionReviewBox key={`resolution-${report.id}`} report={report} />
      ) : null}

      {canManage && (!isOwner || auth.isModerator) ? (
        <div className="detail-tools">
          {auth.isModerator && published && !resolved && !resolutionPending ? (
            <MarkResolvedButton key={`resolve-${report.id}`} report={report} />
          ) : null}
          {!isOwner ? (
            <>
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => editReport(report)}
              >
                <Pencil size={12} aria-hidden="true" /> Izmeni prijavu
              </button>
              <DeleteReportButton report={report} />
            </>
          ) : null}
        </div>
      ) : null}

      {auth.isModerator && moderatedLine ? (
        <p className="detail-moderated">{moderatedLine}</p>
      ) : null}

      <div className="detail-meta">
        <span>Koordinate su numeričke i javne.</span>
        <a href={`${APP.openStreetMap}?mlat=${report.latitude}&mlon=${report.longitude}`} target="_blank" rel="noreferrer">
          Podaci o mapi
        </a>
      </div>
    </Drawer>
  );
}
