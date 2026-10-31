import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
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
import { APP, REJECT_REASONS, REPORT_STATUSES } from '../config';
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
import { CategoryTag } from './ui/CategoryGlyph';
import { ActionStatusBadge } from './ui/ActionStatusBadge';
import { SectionLabel, Spinner } from './ui/EmptyState';
import { DeleteReportButton } from './ui/DeleteReportButton';
import { ModerationBadge } from './ui/ModerationBadge';
import { ReportPlan } from './ui/ReportPlan';
import { StatusBadge } from './ui/StatusBadge';
import { RejectForm } from './moderation/RejectForm';
import type { Report, ReportStatus } from '../types';

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
    flyTo,
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

      <PhotoGallery
        images={report.imageUrls}
        onOpen={(index) =>
          openModal({ kind: 'lightbox', images: report.imageUrls, index })
        }
      />

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
              onClick={() => flyTo(report, undefined, { accountForDrawer: true })}
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

      {canManage && !isOwner ? (
        <div className="detail-tools">
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => editReport(report)}
          >
            <Pencil size={12} aria-hidden="true" /> Izmeni prijavu
          </button>
          <DeleteReportButton report={report} />
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
