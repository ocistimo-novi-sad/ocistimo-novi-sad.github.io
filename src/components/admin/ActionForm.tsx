import { useState, type FormEvent } from 'react';
import { TriangleAlert } from 'lucide-react';
import { ACTION_STATUSES, APP } from '../../config';
import { formatDateInput } from '../../lib/format';
import { createActionRecord, updateActionRecord } from '../../services/actions';
import { toSerbianError } from '../../services/errors';
import { useApp } from '../../state/app-context';
import type { ActionStatus, CleanupAction, NewActionInput, Report } from '../../types';
import { CategoryGlyph } from '../ui/CategoryGlyph';
import { Spinner } from '../ui/EmptyState';
import { StatusDot } from '../ui/StatusBadge';
import { LocationPicker } from './LocationPicker';

const TITLE_MIN = 5;
const TITLE_MAX = 120;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 2000;
const MEETING_MAX = 160;
const ORGANIZER_MAX = 80;
const NOTE_MAX = 600;
const MAX_REPORTS = 50;
const MAX_SUPPLIES = 20;

type ErrorKey =
  | 'title'
  | 'description'
  | 'date'
  | 'meetingPoint'
  | 'coordinates'
  | 'organizer'
  | 'supplies';

type Errors = Partial<Record<ErrorKey, string>>;

function defaultDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  return date;
}

export function ActionForm({
  action,
  reports,
  onCancel,
  onSaved,
}: {
  action: CleanupAction | null;
  reports: Report[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { auth, notify } = useApp();

  const [title, setTitle] = useState(action?.title ?? '');
  const [description, setDescription] = useState(action?.description ?? '');
  const [dateValue, setDateValue] = useState(
    formatDateInput(action?.date ?? defaultDate()),
  );
  const [meetingPoint, setMeetingPoint] = useState(action?.meetingPoint ?? '');
  const [latitude, setLatitude] = useState(
    action ? action.latitude.toFixed(6) : APP.center.latitude.toFixed(6),
  );
  const [longitude, setLongitude] = useState(
    action ? action.longitude.toFixed(6) : APP.center.longitude.toFixed(6),
  );
  const [status, setStatus] = useState<ActionStatus>(action?.status ?? 'planned');
  const [suppliesText, setSuppliesText] = useState(action?.supplies.join('\n') ?? '');
  const [organizerName, setOrganizerName] = useState(
    action?.organizerName ?? auth.user?.displayName ?? '',
  );
  const [organizerNote, setOrganizerNote] = useState(action?.organizerNote ?? '');
  const [selectedReports, setSelectedReports] = useState<string[]>(action?.reportIds ?? []);

  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const latNumber = Number(latitude.replace(',', '.'));
  const lngNumber = Number(longitude.replace(',', '.'));
  const coordinatesValid = Number.isFinite(latNumber) && Number.isFinite(lngNumber);

  const toggleReport = (reportId: string) => {
    setSelectedReports((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : current.length >= MAX_REPORTS
          ? current
          : [...current, reportId],
    );
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (title.trim().length < TITLE_MIN) {
      next.title = `Naziv mora imati najmanje ${TITLE_MIN} znakova.`;
    }
    if (description.trim().length < DESCRIPTION_MIN) {
      next.description = `Opis mora imati najmanje ${DESCRIPTION_MIN} znakova.`;
    }
    const date = new Date(dateValue);
    if (!dateValue || Number.isNaN(date.getTime())) {
      next.date = 'Izaberite datum i vreme akcije.';
    }
    if (!meetingPoint.trim()) {
      next.meetingPoint = 'Unesite mesto okupljanja.';
    }
    if (
      !coordinatesValid ||
      latNumber < APP.bounds.south ||
      latNumber > APP.bounds.north ||
      lngNumber < APP.bounds.west ||
      lngNumber > APP.bounds.east
    ) {
      next.coordinates = 'Koordinate moraju biti unutar područja Novog Sada.';
    }
    if (!organizerName.trim()) {
      next.organizer = 'Unesite naziv organizatora.';
    }
    const supplies = suppliesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (supplies.length > MAX_SUPPLIES) {
      next.supplies = `Najviše ${MAX_SUPPLIES} stavki opreme.`;
    }
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const supplies = suppliesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_SUPPLIES);

    const input: NewActionInput = {
      title: title.trim(),
      description: description.trim(),
      date: new Date(dateValue),
      meetingPoint: meetingPoint.trim(),
      latitude: latNumber,
      longitude: lngNumber,
      status,
      reportIds: selectedReports,
      supplies,
      organizerName: organizerName.trim(),
      organizerNote: organizerNote.trim(),
    };

    setSaving(true);
    setSubmitError(null);
    try {
      if (action) {
        await updateActionRecord(action.id, input);
        notify('success', 'Akcija je ažurirana.');
      } else {
        await createActionRecord(input);
        notify('success', 'Akcija je objavljena.');
      }
      onSaved();
    } catch (error) {
      setSubmitError(toSerbianError(error, 'Akcija nije sačuvana. Pokušajte ponovo.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={(event) => void submit(event)}>
      <div className="admin-form__scroll">
        {submitError ? (
          <div className="form-alert" role="alert">
            <TriangleAlert size={15} aria-hidden="true" />
            <p>{submitError}</p>
          </div>
        ) : null}

        <div className="admin-form__section">
          <p className="eyebrow">Osnovno</p>

          <div className={`field${errors.title ? ' has-error' : ''}`}>
            <div className="field__top">
              <label htmlFor="action-title">Naziv akcije</label>
              <span className="field__counter">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="action-title"
              type="text"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Na primer: Jesenje čišćenje Futoškog parka"
              disabled={saving}
            />
            {errors.title ? <p className="field__error">{errors.title}</p> : null}
          </div>

          <div className={`field${errors.description ? ' has-error' : ''}`}>
            <div className="field__top">
              <label htmlFor="action-description">Opis i plan rada</label>
              <span className="field__counter">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="action-description"
              rows={4}
              value={description}
              maxLength={DESCRIPTION_MAX}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Šta se radi, kako je organizovano, šta učesnici treba da znaju."
              disabled={saving}
            />
            {errors.description ? <p className="field__error">{errors.description}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="action-status">Status akcije</label>
            <select
              id="action-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ActionStatus)}
              disabled={saving}
            >
              {ACTION_STATUSES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="field__hint">Status menjajte kada se termin potvrdi ili akcija završi.</p>
          </div>
        </div>

        <div className="admin-form__section">
          <p className="eyebrow">Termin i mesto</p>

          <div className="form-row">
            <div className={`field${errors.date ? ' has-error' : ''}`}>
              <label htmlFor="action-date">Datum i vreme</label>
              <input
                id="action-date"
                type="datetime-local"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                disabled={saving}
              />
              {errors.date ? <p className="field__error">{errors.date}</p> : null}
            </div>

            <div className={`field${errors.meetingPoint ? ' has-error' : ''}`}>
              <div className="field__top">
                <label htmlFor="action-meeting">Mesto okupljanja</label>
                <span className="field__counter">
                  {meetingPoint.length}/{MEETING_MAX}
                </span>
              </div>
              <input
                id="action-meeting"
                type="text"
                value={meetingPoint}
                maxLength={MEETING_MAX}
                onChange={(event) => setMeetingPoint(event.target.value)}
                placeholder="Ulaz u park, kod spomenika…"
                disabled={saving}
              />
              {errors.meetingPoint ? (
                <p className="field__error">{errors.meetingPoint}</p>
              ) : null}
            </div>
          </div>

          <div className={`field${errors.coordinates ? ' has-error' : ''}`}>
            <span className="field__label">Koordinate mesta okupljanja</span>
            <div className="coord-row">
              <label className="coord-input">
                <span>Geografska širina</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  disabled={saving}
                />
              </label>
              <label className="coord-input">
                <span>Geografska dužina</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  disabled={saving}
                />
              </label>
            </div>
            {errors.coordinates ? (
              <p className="field__error">{errors.coordinates}</p>
            ) : null}
          </div>

          {coordinatesValid ? (
            <LocationPicker
              latitude={latNumber}
              longitude={lngNumber}
              onChange={(point) => {
                setLatitude(point.latitude.toFixed(6));
                setLongitude(point.longitude.toFixed(6));
              }}
            />
          ) : null}
        </div>

        <div className="admin-form__section">
          <p className="eyebrow">Povezane prijave</p>
          <p className="admin-form__hint">
            Izaberite prijave koje ova akcija rešava. Veza je vidljiva na obe strane.
          </p>
          {reports.length === 0 ? (
            <p className="field__hint">Nema učitanih prijava za povezivanje.</p>
          ) : (
            <div className="report-picker" role="group" aria-label="Povezane prijave">
              {reports.map((report) => {
                const checked = selectedReports.includes(report.id);
                return (
                  <label
                    key={report.id}
                    className={`report-pick${checked ? ' is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReport(report.id)}
                      disabled={saving}
                    />
                    <span className="report-pick__glyph" data-category={report.category}>
                      <CategoryGlyph category={report.category} size={12} />
                    </span>
                    <span className="report-pick__title">{report.title}</span>
                    <StatusDot status={report.status} />
                  </label>
                );
              })}
            </div>
          )}
          <p className="field__hint">
            Izabrano {selectedReports.length} od najviše {MAX_REPORTS} prijava.
          </p>
        </div>

        <div className="admin-form__section">
          <p className="eyebrow">Oprema i organizator</p>

          <div className={`field${errors.supplies ? ' has-error' : ''}`}>
            <label htmlFor="action-supplies">Šta je potrebno poneti</label>
            <textarea
              id="action-supplies"
              rows={4}
              value={suppliesText}
              onChange={(event) => setSuppliesText(event.target.value)}
              placeholder={'Rukavice\nVreće za otpad\nGrablje i metle'}
              disabled={saving}
            />
            <p className="field__hint">Jedna stavka po redu. Najviše {MAX_SUPPLIES} stavki.</p>
            {errors.supplies ? <p className="field__error">{errors.supplies}</p> : null}
          </div>

          <div className={`field${errors.organizer ? ' has-error' : ''}`}>
            <div className="field__top">
              <label htmlFor="action-organizer">Organizator</label>
              <span className="field__counter">
                {organizerName.length}/{ORGANIZER_MAX}
              </span>
            </div>
            <input
              id="action-organizer"
              type="text"
              value={organizerName}
              maxLength={ORGANIZER_MAX}
              onChange={(event) => setOrganizerName(event.target.value)}
              placeholder="Udruženje, mesna zajednica ili ime organizatora"
              disabled={saving}
            />
            {errors.organizer ? <p className="field__error">{errors.organizer}</p> : null}
          </div>

          <div className="field">
            <div className="field__top">
              <label htmlFor="action-note">
                Napomena za učesnike <span className="field__optional">opciono</span>
              </label>
              <span className="field__counter">
                {organizerNote.length}/{NOTE_MAX}
              </span>
            </div>
            <textarea
              id="action-note"
              rows={3}
              value={organizerNote}
              maxLength={NOTE_MAX}
              onChange={(event) => setOrganizerNote(event.target.value)}
              placeholder="Kontakt, pravila, šta učesnici treba da znaju."
              disabled={saving}
            />
          </div>
        </div>
      </div>

      <div className="admin-form__actions">
        <button type="button" className="btn btn--quiet" onClick={onCancel} disabled={saving}>
          Nazad
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? <Spinner size={15} /> : null}
          {saving ? 'Čuvanje…' : action ? 'Sačuvaj izmene' : 'Objavi akciju'}
        </button>
      </div>
    </form>
  );
}
