import { useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  HandHeart,
  MapPin,
  Pencil,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { formatCoordinates, formatDate, formatTime, formatWeekday, plural } from '../lib/format';
import { openStreetMapUrl } from '../lib/geo';
import { updateActionStatus } from '../services/actions';
import { toSerbianError } from '../services/errors';
import { useApp } from '../state/app-context';
import { Drawer } from './Drawer';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { SectionLabel, Spinner } from './ui/EmptyState';
import { ActionStatusBadge } from './ui/ActionStatusBadge';
import { StatusBadge } from './ui/StatusBadge';

export function ActionDetail() {
  const {
    selectedAction: action,
    actionReports,
    closeSelection,
    selectReport,
    flyTo,
    auth,
    openModal,
    reloadActions,
    notify,
  } = useApp();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!action) return null;

  const isPast = action.date.getTime() < Date.now();

  const cancelAction = async () => {
    setCancelling(true);
    try {
      await updateActionStatus(action.id, 'cancelled');
      await reloadActions();
      setConfirmCancel(false);
      notify('success', 'Akcija je otkazana.');
    } catch (error) {
      notify('error', toSerbianError(error, 'Akciju nije moguće otkazati.'));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Drawer
      label={`Akcija: ${action.title}`}
      onClose={closeSelection}
      className="drawer--action"
      footer={
        <div className="detail-foot">
          <span className="link-btn link-btn--muted">
            <HandHeart size={13} aria-hidden="true" />
            Akcija zajednice
          </span>
          <span className="detail-foot__hint">
            {actionReports.length}{' '}
            {plural(
              actionReports.length,
              'povezana prijava',
              'povezane prijave',
              'povezanih prijava',
            )}
          </span>
        </div>
      }
    >
      <div className="detail-head">
        <div className="detail-tags">
          <span className="eyebrow">Akcija čišćenja</span>
          <ActionStatusBadge status={action.status} />
        </div>
      </div>

      <h2 className="detail-title">{action.title}</h2>

      <div className="action-hero">
        <div className="action-hero__date">
          <span className="action-hero__weekday">{formatWeekday(action.date)}</span>
          <strong>{formatDate(action.date)}</strong>
          <span className="action-hero__time">
            <Clock size={13} aria-hidden="true" />
            {formatTime(action.date)}
          </span>
        </div>
        <p className={`action-hero__state${isPast && action.status !== 'completed' ? ' is-muted' : ''}`}>
          {action.status === 'completed'
            ? 'Akcija je završena.'
            : action.status === 'cancelled'
              ? 'Akcija je otkazana.'
              : isPast
                ? 'Predviđeni termin je prošao. Proverite sa organizatorom.'
                : 'Okupljanje je zakazano. Dolazak nije potrebno najavljivati osim ako organizator traži drugačije.'}
        </p>
      </div>

      <section className="detail-section">
        <SectionLabel>O akciji</SectionLabel>
        <p className="detail-prose">{action.description}</p>
      </section>

      <section className="detail-section">
        <SectionLabel>Mesto okupljanja</SectionLabel>
        <div className="location-box">
          <div className="location-box__head">
            <MapPin size={14} aria-hidden="true" />
            <span>{action.meetingPoint || 'Novi Sad'}</span>
          </div>
          <code className="location-box__coords">
            {formatCoordinates(action.latitude, action.longitude)}
          </code>
          <div className="location-box__actions">
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => flyTo(action, undefined, { accountForDrawer: true })}
            >
              Prikaži na mapi
            </button>
            <a
              className="btn btn--quiet btn--sm"
              href={openStreetMapUrl(action)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} aria-hidden="true" /> OpenStreetMap
            </a>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <SectionLabel>Organizator</SectionLabel>
        <div className="organizer">
          <span className="organizer__icon">
            <Users size={15} aria-hidden="true" />
          </span>
          <div>
            <p className="organizer__name">
              {action.organizerName || 'Administracija Kuka i Motika'}
            </p>
            {action.organizerNote ? (
              <p className="organizer__note">{action.organizerNote}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="detail-section">
        <div className="section-head-row">
          <SectionLabel>Povezane prijave</SectionLabel>
          <span className="section-count">{actionReports.length}</span>
        </div>

        {actionReports.length > 0 ? (
          <ul className="linked-reports">
            {actionReports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  className="linked-report"
                  onClick={() => selectReport(report)}
                >
                  <span className="linked-report__glyph" data-category={report.category}>
                    <CategoryGlyph category={report.category} size={13} />
                  </span>
                  <span className="linked-report__body">
                    <span className="linked-report__title">{report.title}</span>
                    <StatusBadge status={report.status} compact />
                  </span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-prose detail-prose--muted">
            Ova akcija još nema povezane prijave.
          </p>
        )}
      </section>

      <section className="detail-section">
        <SectionLabel>Šta je potrebno poneti</SectionLabel>
        {action.supplies.length > 0 ? (
          <ul className="supply-list">
            {action.supplies.map((supply) => (
              <li key={supply}>
                <Check size={13} aria-hidden="true" />
                {supply}
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-prose detail-prose--muted">
            Organizator nije naveo posebnu opremu. Dođite u udobnoj odeći i obući.
          </p>
        )}
      </section>

      {auth.isAdmin && action.source === 'firestore' ? (
        <div className="admin-box">
          <p className="admin-box__title">
            <ShieldCheck size={14} aria-hidden="true" />
            Upravljanje akcijom
          </p>

          {confirmCancel ? (
            <div className="admin-confirm">
              <p>Otkazati ovu akciju? Povezane prijave ostaju sačuvane.</p>
              <div className="admin-confirm__actions">
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => void cancelAction()}
                  disabled={cancelling}
                >
                  {cancelling ? <Spinner size={13} /> : <X size={13} aria-hidden="true" />}
                  Potvrdi otkazivanje
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setConfirmCancel(false)}
                  disabled={cancelling}
                >
                  Odustani
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-box__row">
              <button
                type="button"
                className="btn btn--quiet btn--sm"
                onClick={() => openModal({ kind: 'admin', editActionId: action.id })}
              >
                <Pencil size={13} aria-hidden="true" /> Uredi akciju
              </button>
              {action.status !== 'cancelled' && action.status !== 'completed' ? (
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => setConfirmCancel(true)}
                >
                  <CalendarDays size={13} aria-hidden="true" /> Otkaži akciju
                </button>
              ) : null}
            </div>
          )}
          <p className="admin-box__hint">
            Akcije menjaju samo administratori. Izmene su vidljive svim posetiocima.
          </p>
        </div>
      ) : null}
    </Drawer>
  );
}
