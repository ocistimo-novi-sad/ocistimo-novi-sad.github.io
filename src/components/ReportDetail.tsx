import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { APP, REPORT_STATUSES } from '../config';
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
import { StatusBadge } from './ui/StatusBadge';
import type { ReportStatus } from '../types';

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
        Administratorska izmena
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
          <button
            type="button"
            className="link-btn link-btn--muted"
            onClick={() => requestFlag(report.id)}
          >
            <Flag size={13} aria-hidden="true" />
            Prijavi sadržaj
          </button>
          <span className="detail-foot__hint">Prijava zajednice</span>
        </div>
      }
    >
      <div className="detail-head">
        <div className="detail-tags">
          <CategoryTag category={report.category} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      <h2 className="detail-title">{report.title}</h2>

      <p className="detail-byline">
        Autor prijave: {report.createdByName ?? 'član zajednice'} ·{' '}
        {formatDateTime(report.createdAt)}
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

      {auth.isAdmin && report.source === 'firestore' ? (
        <AdminStatusBox
          currentStatus={report.status}
          saving={saving}
          value={adminStatus}
          onChange={setAdminStatus}
          onSave={() => void saveStatus()}
        />
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
