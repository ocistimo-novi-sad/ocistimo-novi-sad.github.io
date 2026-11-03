import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Crosshair,
  Info,
  Navigation,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import {
  APP,
  CATEGORIES,
  COMMUNITY_CAN_PRESETS,
  DEFAULT_CATEGORY,
  HELP_NEEDED_PRESETS,
  LIMITS,
} from '../config';
import { addDemoReport } from '../demo/store';
import { formatCoordinates } from '../lib/format';
import { isInServiceArea } from '../lib/geo';
import { toSerbianError } from '../services/errors';
import { isFirebaseConfigured } from '../services/firebase';
import { usePhotoUploads } from '../hooks/usePhotoUploads';
import { imagesEnabled } from '../services/images';
import { createReportRecord } from '../services/reports';
import { useApp } from '../state/app-context';
import type { Category, NewReportInput, Report } from '../types';
import { Drawer, type Snap } from './Drawer';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { ConfirmSheet } from './ui/ConfirmSheet';
import { CharCount } from './ui/CharCount';
import { ErrorSummary, FieldError } from './ui/FormErrors';
import { Spinner } from './ui/EmptyState';
import { PhotoPicker } from './ui/PhotoPicker';
import { prefersReducedMotion } from '../lib/motion';

type FieldKey =
  | 'location'
  | 'address'
  | 'title'
  | 'category'
  | 'description'
  | 'communityCan'
  | 'helpNeeded'
  | 'photos';
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Fields in the order of the form, and what gets focus for each error. */
const FIELD_ORDER: FieldKey[] = [
  'location',
  'address',
  'title',
  'category',
  'description',
  'communityCan',
  'helpNeeded',
  'photos',
];
const FIELD_TARGET: Record<FieldKey, string> = {
  location: 'compose-map-button',
  address: 'report-address',
  title: 'report-title',
  category: 'category-first',
  description: 'report-description',
  communityCan: 'report-community',
  helpNeeded: 'report-help',
  photos: 'compose-photo-button',
};

const TITLE_MIN = LIMITS.titleMin;
const TITLE_MAX = LIMITS.titleMax;
const DESC_MIN = LIMITS.descriptionMin;
const DESC_MAX = LIMITS.descriptionMax;
const COMMUNITY_MIN = LIMITS.communityMin;
const COMMUNITY_MAX = LIMITS.communityMax;

/** Appends a quick pick on its own line, unless the text already has it. */
function appendPreset(value: string, preset: string): string {
  const trimmed = value.trimEnd();
  if (trimmed.includes(preset)) return value;
  const next = trimmed ? `${trimmed}\n${preset}` : preset;
  return next.slice(0, COMMUNITY_MAX);
}

function PlanField({
  id,
  label,
  hint,
  placeholder,
  presets,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  presets: string[];
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <div className="field__top">
        <label htmlFor={id}>{label}</label>
        <CharCount value={value} max={COMMUNITY_MAX} />
      </div>
      <div className="preset-row" role="group" aria-label={`Brzi izbor: ${label}`}>
        {presets.map((preset) => {
          const used = value.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              className={`preset-chip${used ? ' is-used' : ''}`}
              onClick={() => onChange(appendPreset(value, preset))}
              disabled={disabled || used}
            >
              {used ? <Check size={11} aria-hidden="true" /> : <Plus size={11} aria-hidden="true" />}
              {preset}
            </button>
          );
        })}
      </div>
      <textarea
        id={id}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `hint-${id} error-${id}` : `hint-${id}`}
        disabled={disabled}
      />
      <p className="field__hint" id={`hint-${id}`}>
        {hint}
      </p>
      {error ? <FieldError id={`error-${id}`}>{error}</FieldError> : null}
    </div>
  );
}

export function ComposeDrawer() {
  const {
    composeLocation,
    composeEditing: editing,
    composeGuardRef,
    setComposeLocation,
    cancelCompose,
    addCreatedReport,
    storeCreatedReport,
    submitReportEdit,
    flyTo,
    notify,
    auth,
    userPosition,
    mapRef,
  } = useApp();

  // The drawer is keyed by the edited report, so these initial values are
  // read once per report.
  const [initial] = useState(() => ({
    title: editing?.title ?? '',
    category: editing?.category ?? DEFAULT_CATEGORY,
    description: editing?.description ?? '',
    communityCan: editing?.communityCan ?? '',
    helpNeeded: editing?.helpNeeded ?? '',
    address: editing?.address ?? '',
    imageUrls: editing?.imageUrls ?? [],
  }));

  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState<Category | null>(initial.category);
  const [description, setDescription] = useState(initial.description);
  const [communityCan, setCommunityCan] = useState(initial.communityCan);
  const [helpNeeded, setHelpNeeded] = useState(initial.helpNeeded);
  const [address, setAddress] = useState(initial.address);
  const [submitted, setSubmitted] = useState<Report | null>(null);
  const { photos, addFiles: addPhotoFiles, removePhoto, uploadAll } = usePhotoUploads({
    initialUrls: initial.imageUrls,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  // The summary shows after the first try to send, and takes focus on each failed try.
  const [failedSends, setFailedSends] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [locating, setLocating] = useState(false);
  // Why "Koristi moju lokaciju" did not work; stays until a point is chosen.
  const [locationNote, setLocationNote] = useState<string | null>(null);
  // "Izaberi" lowers the sheet as far as it goes, so most of the map is free;
  // a failed send brings it back up to show the errors.
  const [snapRequest, setSnapRequest] = useState<{ snap: Snap; id: number }>();
  const requestSnap = (snap: Snap) => setSnapRequest((value) => ({ snap, id: (value?.id ?? 0) + 1 }));

  const outsideArea = composeLocation !== null && !isInServiceArea(composeLocation);
  const locationMoved = editing
    ? composeLocation?.latitude !== editing.latitude ||
      composeLocation?.longitude !== editing.longitude
    : composeLocation !== null;
  const dirty =
    title.trim() !== initial.title.trim() ||
    description.trim() !== initial.description.trim() ||
    communityCan.trim() !== initial.communityCan.trim() ||
    helpNeeded.trim() !== initial.helpNeeded.trim() ||
    address.trim() !== initial.address.trim() ||
    category !== initial.category ||
    photos.length !== initial.imageUrls.length ||
    photos.some((photo, index) => photo.url !== initial.imageUrls[index]) ||
    locationMoved;

  // Back (browser or phone) asks the same question as "Otkaži" when the form has text.
  useEffect(() => {
    composeGuardRef.current = () => {
      if (submitting || submitted || !dirty) return false;
      setConfirmClose(true);
      return true;
    };
    return () => {
      composeGuardRef.current = null;
    };
  });

  // Wording for the three ways this drawer is used.
  const isModeratorEdit = Boolean(editing && auth.isModerator);
  const editsPublished = Boolean(editing && editing.moderation === 'approved');

  const requestClose = () => {
    if (submitting) return;
    if (submitted) {
      cancelCompose();
      return;
    }
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    cancelCompose();
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!composeLocation) {
      next.location = 'Izaberi lokaciju na mapi.';
    } else if (!isInServiceArea(composeLocation)) {
      next.location = 'Lokacija mora biti u Novom Sadu.';
    }

    if (address.trim().length > LIMITS.addressMax) {
      next.address = `Adresa može imati najviše ${LIMITS.addressMax} znakova. Skrati je.`;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) next.title = 'Unesi naslov prijave.';
    else if (trimmedTitle.length < TITLE_MIN) {
      next.title = `Naslov mora imati najmanje ${TITLE_MIN} znakova.`;
    } else if (trimmedTitle.length > TITLE_MAX) {
      next.title = `Naslov može imati najviše ${TITLE_MAX} znakova. Skrati ga.`;
    }

    if (!category) next.category = 'Izaberi kategoriju.';

    const trimmedDescription = description.trim();
    if (!trimmedDescription) next.description = 'Opiši problem.';
    else if (trimmedDescription.length < DESC_MIN) {
      next.description = `Opis mora imati najmanje ${DESC_MIN} znakova.`;
    } else if (trimmedDescription.length > DESC_MAX) {
      next.description = `Opis može imati najviše ${DESC_MAX} znakova. Skrati ga.`;
    }

    if (communityCan.trim().length < COMMUNITY_MIN) {
      next.communityCan = communityCan.trim()
        ? `Napiši bar ${COMMUNITY_MIN} znakova ili izaberi ponuđeno.`
        : 'Napiši šta zajednica može sama ili izaberi ponuđeno.';
    } else if (communityCan.trim().length > COMMUNITY_MAX) {
      next.communityCan = `Ovde može najviše ${COMMUNITY_MAX} znakova. Skrati tekst.`;
    }
    if (helpNeeded.trim().length < COMMUNITY_MIN) {
      next.helpNeeded = helpNeeded.trim()
        ? `Napiši bar ${COMMUNITY_MIN} znakova ili izaberi ponuđeno.`
        : 'Napiši za šta je potrebna pomoć ili izaberi ponuđeno.';
    } else if (helpNeeded.trim().length > COMMUNITY_MAX) {
      next.helpNeeded = `Ovde može najviše ${COMMUNITY_MAX} znakova. Skrati tekst.`;
    }

    if (photos.length > LIMITS.imagesMax) {
      next.photos = `Dozvoljeno je najviše ${LIMITS.imagesMax} fotografije.`;
    }

    return next;
  };

  useEffect(() => {
    if (failedSends > 0) summaryRef.current?.focus();
  }, [failedSends]);

  // A point on the map answers the location question.
  useEffect(() => {
    if (!composeLocation) return;
    setErrors((prev) => (prev.location ? { ...prev, location: undefined } : prev));
    setLocationNote(null);
  }, [composeLocation]);

  // A server error gets focus too, so it is read out and Tab goes on from it.
  useEffect(() => {
    if (submitError) alertRef.current?.focus();
  }, [submitError]);

  const summaryErrors =
    failedSends > 0
      ? FIELD_ORDER.flatMap((key) => {
          const message = errors[key];
          return message ? [{ id: FIELD_TARGET[key], message }] : [];
        })
      : [];

  const addFiles = (fileList: FileList | null) => {
    const error = addPhotoFiles(fileList);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next.photos = error;
      else delete next.photos;
      return next;
    });
  };

  const submit = async () => {
    if (submitting) return;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFailedSends((value) => value + 1);
      requestSnap('normal');
      return;
    }
    if (!composeLocation) return;

    if (isFirebaseConfigured && !auth.user) {
      setSubmitError('Prijava je istekla. Prijavi se ponovo i pokušaj.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setConfirmClose(false);

    const upload = await uploadAll();
    if (upload.error !== undefined) {
      setSubmitting(false);
      setSubmitError(
        `Prijava nije poslata jer fotografija nije otpremljena: ${upload.error} Pokušaj ponovo.`,
      );
      return;
    }
    const urls = upload.urls;

    const input: NewReportInput = {
      title: title.trim(),
      description: description.trim(),
      communityCan: communityCan.trim(),
      helpNeeded: helpNeeded.trim(),
      category: category as Category,
      latitude: composeLocation.latitude,
      longitude: composeLocation.longitude,
      address: address.trim() || undefined,
      createdByName: auth.user?.displayName ?? undefined,
    };

    try {
      if (editing) {
        await submitReportEdit(editing, {
          title: input.title,
          description: input.description,
          communityCan: input.communityCan,
          helpNeeded: input.helpNeeded,
          category: input.category,
          latitude: input.latitude,
          longitude: input.longitude,
          address: input.address,
          imageUrls: urls,
        });
      } else if (isFirebaseConfigured) {
        // Not public until a moderator approves it, so stay here and say so.
        const report = await createReportRecord(input, urls);
        storeCreatedReport(report);
        setSubmitted(report);
      } else {
        const report = addDemoReport(input, urls);
        addCreatedReport(report);
        notify('success', 'Prijava je sačuvana lokalno. Demo režim.');
      }
    } catch (error) {
      const base = toSerbianError(
        error,
        'Prijava nije sačuvana. Proveri vezu i pokušaj ponovo.',
      );
      setSubmitError(
        urls.length > 0
          ? `${base} Fotografije su već otpremljene i neće biti ponovo poslate pri sledećem pokušaju.`
          : base,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const focusMap = () => {
    requestSnap('peek');
    const map = mapRef.current;
    // Focus goes to the map, where the arrow keys move it and Enter puts the
    // point under the crosshair. A click or tap works there as before.
    map?.getContainer().focus({ preventScroll: true });
    if (composeLocation) {
      flyTo(composeLocation, undefined, { accountForDrawer: true });
      return;
    }
    map?.flyTo([APP.center.latitude, APP.center.longitude], 14, {
      duration: 0.5,
      animate: !prefersReducedMotion(),
    });
  };

  const useMyLocation = () => {
    if (locating) return;
    if (!('geolocation' in navigator)) {
      notify('error', 'Tvoj pregledač ne podržava određivanje lokacije.');
      return;
    }
    if (userPosition) {
      setComposeLocation({
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      });
      requestSnap('peek');
      flyTo(userPosition, 17, { accountForDrawer: true });
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setComposeLocation(point);
        requestSnap('peek');
        flyTo(point, 17, { accountForDrawer: true });
        if (!isInServiceArea(point)) {
          notify('error', 'Tvoja lokacija je izvan Novog Sada.');
        }
      },
      (error) => {
        setLocating(false);
        setLocationNote(
          error.code === error.PERMISSION_DENIED
            ? 'Pristup lokaciji je odbijen. Izaberi tačku na mapi, ili „Izaberi“ pa Enter na tastaturi.'
            : 'Lokaciju nije moguće odrediti. Izaberi tačku na mapi.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  if (submitted) {
    return (
      <Drawer
        key="sent"
        label="Prijava je poslata"
        onClose={cancelCompose}
        className="drawer--compose"
        footer={
          <div className="compose-foot">
            <div className="compose-foot__row">
              <button type="button" className="btn btn--primary" onClick={cancelCompose}>
                Zatvori
              </button>
            </div>
          </div>
        }
      >
        <div className="submit-success" role="status">
          <span className="submit-success__icon" aria-hidden="true">
            <Clock3 size={22} />
          </span>
          <h2 className="compose-title">Hvala! Prijava je na pregledu.</h2>
          <p className="compose-sub">
            Moderator će pregledati „{submitted.title}” i objaviti je na mapi. Do tada je vidiš
            samo ti i moderatori.
          </p>
          <ol className="submit-success__steps">
            <li className="is-done">
              <Check size={12} aria-hidden="true" /> Prijava je poslata
            </li>
            <li className="is-current">
              <Clock3 size={12} aria-hidden="true" /> Pregled moderatora
            </li>
            <li>
              <span className="submit-success__dot" aria-hidden="true" /> Objava na mapi
            </li>
          </ol>
          <p className="submit-success__note">
            Ako nešto treba ispraviti, moderator će napisati razlog. Videćeš ga uz prijavu kad
            se prijaviš ovim nalogom.
          </p>
        </div>
      </Drawer>
    );
  }

  const submitLabel = editing
    ? submitting
      ? 'Čuvam…'
      : isModeratorEdit || editsPublished
        ? 'Sačuvaj izmene'
        : 'Pošalji ponovo na pregled'
    : isFirebaseConfigured
      ? submitting
        ? 'Šaljem…'
        : 'Pošalji na pregled'
      : submitting
        ? 'Objavljujem…'
        : 'Objavi prijavu';

  const footNote = editing
    ? isModeratorEdit
      ? 'Izmena moderatora se odmah primenjuje i beleži uz tvoj nalog.'
      : editsPublished
        ? 'Izmena se odmah vidi, a moderator će je pregledati. Ne unosi lične podatke.'
        : 'Posle ispravke prijava ponovo ide na pregled. Ne unosi lične podatke.'
    : isFirebaseConfigured
      ? 'Moderator pregleda prijavu pre objave. Ne unosi lične podatke.'
      : 'Ne unosi lične podatke. Demo režim: prijava se čuva samo u ovom pregledaču.';

  const footer = (
    <div className="compose-foot">
      {submitError ? (
        <div className="form-alert" role="alert" ref={alertRef} tabIndex={-1}>
          <TriangleAlert size={15} aria-hidden="true" />
          <p>{submitError}</p>
        </div>
      ) : null}
      <div className="compose-foot__row">
        {/* Not disabled while sending: a disabled button drops the focus. Both
            handlers ignore presses until sending is over. */}
        <button
          type="button"
          className="btn btn--quiet"
          onClick={requestClose}
          aria-disabled={submitting || undefined}
        >
          Otkaži
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void submit()}
          aria-disabled={submitting || undefined}
        >
          {submitting ? <Spinner size={15} /> : null}
          {submitLabel}
        </button>
      </div>
      <p className="visually-hidden" role="status">
        {submitting ? submitLabel : ''}
      </p>
      <p className="compose-foot__note">{footNote}</p>
    </div>
  );

  return (
    <Drawer
      label={editing ? 'Izmena prijave' : 'Nova prijava'}
      onClose={requestClose}
      footer={footer}
      className="drawer--compose"
      snapRequest={snapRequest}
    >
      <ErrorSummary ref={summaryRef} errors={summaryErrors} />

      <div className="compose-head">
        <span className="eyebrow">{editing ? 'Izmena prijave' : 'Nova prijava'}</span>
        <span className="compose-head__hint">
          {editing
            ? isModeratorEdit
              ? 'Izmena moderatora'
              : editsPublished
                ? 'Ostaje javna'
                : 'Vraća se na pregled'
            : isFirebaseConfigured
              ? 'Objavljuje se posle pregleda'
              : 'Demo režim'}
        </span>
      </div>

      <h2 className="compose-title">
        {editing ? 'Izmeni prijavu' : 'Prijavi problem na mapi'}
      </h2>
      <p className="compose-sub">
        {editing
          ? 'Promeni ono što nije tačno ili nedostaje. Lokaciju pomeraš klikom na mapu.'
          : 'Izaberi tačnu lokaciju, opiši šta nedostaje i dodaj fotografiju ako je imaš.'}
      </p>

      {editing && isModeratorEdit ? (
        <div className="notice notice--info">
          <Info size={14} aria-hidden="true" />
          <p>Menjaš tuđu prijavu kao moderator. Izmena se odmah primenjuje, bez novog pregleda.</p>
        </div>
      ) : null}

      {editing && !isModeratorEdit && editsPublished ? (
        <div className="notice notice--info">
          <Info size={14} aria-hidden="true" />
          <p>
            Prijava je javna. Izmena će odmah biti vidljiva, a moderator će je pregledati i može
            da vrati prethodnu verziju.
          </p>
        </div>
      ) : null}

      {editing && !isModeratorEdit && editing.moderation === 'rejected' ? (
        <div className="reject-note" role="note">
          <p className="reject-note__title">Razlog odbijanja</p>
          <p className="reject-note__reason">
            {editing.rejectionReason ?? 'Moderator nije naveo razlog.'}
          </p>
        </div>
      ) : null}

      {editing && !isModeratorEdit && editing.moderation === 'pending' ? (
        <div className="notice notice--warn">
          <Clock3 size={14} aria-hidden="true" />
          <p>Prijava još čeka pregled. Posle izmene ostaje u redu za pregled.</p>
        </div>
      ) : null}

      {!isFirebaseConfigured ? (
        <div className="notice notice--info">
          <Info size={14} aria-hidden="true" />
          <p>
            Firebase nije povezan, pa se prijava čuva samo u ovom pregledaču. Postupak je isti kao
            u pravoj bazi.
          </p>
        </div>
      ) : null}

      <section className="form-section" aria-labelledby="compose-location-label">
        <div className="form-section__head">
          <span className="form-section__num">01</span>
          <h3 id="compose-location-label">Lokacija</h3>
          {composeLocation && !outsideArea ? (
            <span className="form-section__done" role="img" aria-label="Lokacija je izabrana">
              <Check size={12} aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div
          className={`location-pick${composeLocation ? ' is-set' : ''}${outsideArea || errors.location ? ' is-error' : ''}`}
        >
          <span className="location-pick__icon" aria-hidden="true">
            <Crosshair size={16} />
          </span>
          <div className="location-pick__body">
            <strong>
              {composeLocation ? 'Lokacija je izabrana' : 'Lokacija nije izabrana'}
            </strong>
            <span>
              {composeLocation
                ? formatCoordinates(composeLocation.latitude, composeLocation.longitude)
                : 'Izaberi tačku na mapi.'}
            </span>
          </div>
          <button
            type="button"
            id="compose-map-button"
            className="btn btn--quiet btn--sm"
            onClick={focusMap}
            aria-describedby={errors.location ? 'error-location' : undefined}
          >
            {composeLocation ? 'Pomeri' : 'Izaberi'}
          </button>
        </div>

        <div className="location-actions">
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={useMyLocation}
            aria-disabled={locating || undefined}
          >
            {locating ? <Spinner size={13} /> : <Navigation size={13} aria-hidden="true" />}
            {locating ? 'Traženje lokacije…' : 'Koristi moju lokaciju'}
          </button>
        </div>

        <p className="field__hint location-note" role="status">
          {locationNote}
        </p>
        {errors.location ? <FieldError id="error-location">{errors.location}</FieldError> : null}
        {outsideArea && !errors.location ? (
          <p className="field__error" role="alert">
            Izabrana tačka je izvan Novog Sada.
          </p>
        ) : null}

        {/* Address next to the map point, so the place is described in one spot (#38). */}
        <div className="field">
          <div className="field__top">
            <label htmlFor="report-address">
              Adresa ili orijentir <span className="field__optional">opciono</span>
            </label>
            <CharCount value={address} max={LIMITS.addressMax} />
          </div>
          <input
            id="report-address"
            type="text"
            value={address}
            placeholder="Na primer: Dunavski park, ulaz sa Keja"
            onChange={(event) => {
              setAddress(event.target.value);
              if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? 'hint-address error-address' : 'hint-address'}
            disabled={submitting}
            autoComplete="off"
          />
          <p className="field__hint" id="hint-address">
            Pomaže drugima da pronađu mesto bez otvaranja mape.
          </p>
          {errors.address ? <FieldError id="error-address">{errors.address}</FieldError> : null}
        </div>
      </section>

      <section className="form-section" aria-labelledby="compose-details-label">
        <div className="form-section__head">
          <span className="form-section__num">02</span>
          <h3 id="compose-details-label">Detalji</h3>
        </div>

        <div className={`field${errors.title ? ' has-error' : ''}`}>
          <div className="field__top">
            <label htmlFor="report-title">Naslov</label>
            <CharCount value={title} max={TITLE_MAX} />
          </div>
          <input
            id="report-title"
            type="text"
            value={title}
            placeholder="Na primer: Polomljena klupa u Dunavskom parku"
            onChange={(event) => {
              setTitle(event.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'hint-title error-title' : 'hint-title'}
            disabled={submitting}
            autoComplete="off"
          />
          <p className="field__hint" id="hint-title">
            Najmanje {TITLE_MIN} znakova. Kratko: šta je i gde.
          </p>
          {errors.title ? <FieldError id="error-title">{errors.title}</FieldError> : null}
        </div>

        <fieldset
          className={`field field--fieldset${errors.category ? ' has-error' : ''}`}
          aria-describedby={errors.category ? 'error-category' : undefined}
        >
          <legend className="field__label">Kategorija</legend>
          <div className="category-grid">
            {CATEGORIES.map((option, index) => (
              <label
                key={option.id}
                className={`category-option${category === option.id ? ' is-active' : ''}`}
                data-category={option.id}
              >
                <input
                  id={index === 0 ? 'category-first' : undefined}
                  type="radio"
                  name="report-category"
                  value={option.id}
                  checked={category === option.id}
                  onChange={() => {
                    setCategory(option.id);
                    if (errors.category) {
                      setErrors((prev) => ({ ...prev, category: undefined }));
                    }
                  }}
                  disabled={submitting}
                />
                <CategoryGlyph category={option.id} size={15} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {errors.category ? <FieldError id="error-category">{errors.category}</FieldError> : null}
        </fieldset>

        <div className={`field${errors.description ? ' has-error' : ''}`}>
          <div className="field__top">
            <label htmlFor="report-description">Opis problema</label>
            <CharCount value={description} max={DESC_MAX} />
          </div>
          <textarea
            id="report-description"
            rows={5}
            value={description}
            placeholder="Šta je oštećeno ili zapušteno? Koliko je prostor pristupačan? Šta bi trebalo uraditi?"
            onChange={(event) => {
              setDescription(event.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'hint-description error-description' : 'hint-description'
            }
            disabled={submitting}
          />
          <p className="field__hint" id="hint-description">
            Najmanje {DESC_MIN} znakova. Bez ličnih podataka i bez optužbi.
          </p>
          {errors.description ? (
            <FieldError id="error-description">{errors.description}</FieldError>
          ) : null}
        </div>
      </section>

      <section className="form-section" aria-labelledby="compose-plan-label">
        <div className="form-section__head">
          <span className="form-section__num">03</span>
          <h3 id="compose-plan-label">Kako možemo da rešimo</h3>
        </div>
        <p className="form-section__intro">
          Pojedinci prijavljuju, a zajednica zajedno rešava. Napiši šta komšije mogu same, a gde
          je potrebna pomoć sa strane.
        </p>

        <PlanField
          id="report-community"
          label="Šta zajednica može sama"
          hint={`Najmanje ${COMMUNITY_MIN} znakova ili izaberi ponuđeno. Na primer rad, alat koji već imaš ili termin kada komšije mogu da se okupe.`}
          placeholder="Možemo da skupimo sitan otpad u džakove i očistimo stazu."
          presets={COMMUNITY_CAN_PRESETS}
          value={communityCan}
          error={errors.communityCan}
          disabled={submitting}
          onChange={(value) => {
            setCommunityCan(value);
            if (errors.communityCan) setErrors((prev) => ({ ...prev, communityCan: undefined }));
          }}
        />

        <PlanField
          id="report-help"
          label="Za šta nam treba pomoć"
          hint={`Najmanje ${COMMUNITY_MIN} znakova ili izaberi ponuđeno. Na primer odvoz, materijal, stručan rad ili nadležna služba.`}
          placeholder="Potreban je kontejner za krupni otpad i odvoz šuta."
          presets={HELP_NEEDED_PRESETS}
          value={helpNeeded}
          error={errors.helpNeeded}
          disabled={submitting}
          onChange={(value) => {
            setHelpNeeded(value);
            if (errors.helpNeeded) setErrors((prev) => ({ ...prev, helpNeeded: undefined }));
          }}
        />
      </section>

      <section className="form-section" aria-labelledby="compose-photos-label">
        <div className="form-section__head">
          <span className="form-section__num">04</span>
          <h3 id="compose-photos-label">Fotografije</h3>
          <span className="form-section__optional">opciono</span>
        </div>

        {!imagesEnabled ? (
          <div className="notice notice--warn">
            <TriangleAlert size={14} aria-hidden="true" />
            <p>
              Otpremanje fotografija nije podešeno za ovaj sajt. Prijava može biti objavljena bez
              fotografija.
            </p>
          </div>
        ) : (
          <>
            <PhotoPicker
              photos={photos}
              onAdd={addFiles}
              onRemove={removePhoto}
              disabled={submitting}
              addButtonId="compose-photo-button"
            />

            <p className="field__hint">
              Najviše {LIMITS.imagesMax} fotografije, JPG, PNG ili WebP. Fotografije sa telefona
              možeš dodati takve kakve jesu: aplikacija ih sama smanjuje i uklanja podatke o
              lokaciji pre slanja.
            </p>
          </>
        )}

        {errors.photos ? (
          <FieldError id="error-photos" alert>
            {errors.photos}
          </FieldError>
        ) : null}

        {photos.some((photo) => photo.error) ? (
          <p className="field__error" role="alert">
            Neka fotografija nije otpremljena. Ukloni je ili pokušaj ponovo.
          </p>
        ) : null}
      </section>

      <div className="compose-review">
        <p className="eyebrow">Napomena</p>
        <p>
          {isFirebaseConfigured
            ? 'Moderator pregleda prijavu i objavljuje je na javnoj mapi. Ako nešto treba ispraviti, dobićeš razlog. Posle objave, član zajednice može da je poveže sa akcijom čišćenja. Uz prijavu se javno prikazuje ime sa tvog Google naloga.'
            : 'Prijava se prikazuje na mapi. U pravoj bazi moderator je prvo pregleda, a član zajednice može da je poveže sa akcijom čišćenja.'}
        </p>
      </div>

      {confirmClose && !submitting ? (
        <ConfirmSheet
          title={editing ? 'Odbaciti izmene?' : 'Otkazati prijavu?'}
          message={editing ? 'Prijava ostaje kakva je bila.' : 'Uneti podaci neće biti sačuvani.'}
          keepLabel="Nastavi unos"
          confirmLabel={editing ? 'Odbaci izmene' : 'Otkaži prijavu'}
          onKeep={() => setConfirmClose(false)}
          onConfirm={cancelCompose}
        />
      ) : null}
    </Drawer>
  );
}
