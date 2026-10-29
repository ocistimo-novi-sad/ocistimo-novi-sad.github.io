import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crosshair,
  ImagePlus,
  Info,
  Navigation,
  TriangleAlert,
  X,
} from 'lucide-react';
import { APP, CATEGORIES, LIMITS } from '../config';
import { addDemoReport } from '../demo/store';
import { formatCoordinates } from '../lib/format';
import { isInServiceArea } from '../lib/geo';
import { toSerbianError } from '../services/errors';
import { isFirebaseConfigured } from '../services/firebase';
import { imageStorage, imagesEnabled, validateImageFiles } from '../services/images';
import { createReportRecord } from '../services/reports';
import { useApp } from '../state/app-context';
import type { Category, NewReportInput } from '../types';
import { Drawer } from './Drawer';
import { CategoryGlyph } from './ui/CategoryGlyph';
import { Spinner } from './ui/EmptyState';

interface PhotoDraft {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

type FieldKey = 'location' | 'title' | 'category' | 'description' | 'photos';
type FieldErrors = Partial<Record<FieldKey, string>>;

const TITLE_MIN = LIMITS.titleMin;
const TITLE_MAX = LIMITS.titleMax;
const DESC_MIN = LIMITS.descriptionMin;
const DESC_MAX = LIMITS.descriptionMax;

export function ComposeDrawer() {
  const {
    composeLocation,
    setComposeLocation,
    cancelCompose,
    addCreatedReport,
    flyTo,
    notify,
    auth,
    userPosition,
    mapRef,
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [locating, setLocating] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const outsideArea = composeLocation !== null && !isInServiceArea(composeLocation);
  const dirty = Boolean(
    title.trim() || description.trim() || address.trim() || category || photos.length || composeLocation,
  );

  const requestClose = () => {
    if (submitting) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    cancelCompose();
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!composeLocation) {
      next.location = 'Izaberite lokaciju na mapi.';
    } else if (!isInServiceArea(composeLocation)) {
      next.location = 'Lokacija mora biti u Novom Sadu.';
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) next.title = 'Unesite naslov prijave.';
    else if (trimmedTitle.length < TITLE_MIN) {
      next.title = `Naslov mora imati najmanje ${TITLE_MIN} znakova.`;
    }

    if (!category) next.category = 'Izaberite kategoriju.';

    const trimmedDescription = description.trim();
    if (!trimmedDescription) next.description = 'Opišite problem.';
    else if (trimmedDescription.length < DESC_MIN) {
      next.description = `Opis mora imati najmanje ${DESC_MIN} znakova.`;
    }

    if (photos.length > LIMITS.imagesMax) {
      next.photos = `Dozvoljeno je najviše ${LIMITS.imagesMax} fotografije.`;
    }

    return next;
  };

  const focusFirstError = (next: FieldErrors) => {
    const order: FieldKey[] = ['location', 'title', 'category', 'description', 'photos'];
    const first = order.find((key) => next[key]);
    const ids: Record<FieldKey, string> = {
      location: 'compose-map-button',
      title: 'report-title',
      category: 'category-waste',
      description: 'report-description',
      photos: 'compose-photo-button',
    };
    if (first) document.getElementById(ids[first])?.focus();
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const error = validateImageFiles(incoming, photos.length);
    if (error) {
      setErrors((prev) => ({ ...prev, photos: error }));
      return;
    }

    const drafts: PhotoDraft[] = incoming.map((file) => ({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));
    previewUrls.current.push(...drafts.map((draft) => draft.previewUrl));
    setPhotos((prev) => [...prev, ...drafts]);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.photos;
      return next;
    });
  };

  const removePhoto = (draft: PhotoDraft) => {
    setPhotos((prev) => prev.filter((item) => item.id !== draft.id));
    URL.revokeObjectURL(draft.previewUrl);
    previewUrls.current = previewUrls.current.filter((url) => url !== draft.previewUrl);
  };

  const uploadPhoto = async (draft: PhotoDraft): Promise<string | null> => {
    setPhotos((prev) =>
      prev.map((item) =>
        item.id === draft.id ? { ...item, status: 'uploading', error: undefined } : item,
      ),
    );

    try {
      const result = await imageStorage.upload(draft.file, (percent) => {
        setPhotos((prev) =>
          prev.map((item) => (item.id === draft.id ? { ...item, progress: percent } : item)),
        );
      });
      setPhotos((prev) =>
        prev.map((item) =>
          item.id === draft.id
            ? { ...item, status: 'done', progress: 100, url: result.url }
            : item,
        ),
      );
      return result.url;
    } catch (error) {
      const message = toSerbianError(error, 'Fotografija nije otpremljena.');
      setPhotos((prev) =>
        prev.map((item) =>
          item.id === draft.id ? { ...item, status: 'error', error: message } : item,
        ),
      );
      setSubmitError(message);
      return null;
    }
  };

  const submit = async () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    if (!composeLocation) return;

    if (isFirebaseConfigured && !auth.user) {
      setSubmitError('Prijava je istekla. Prijavite se ponovo i pokušajte.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setConfirmClose(false);

    const urls: string[] = [];
    for (const draft of photos) {
      if (draft.status === 'done' && draft.url) {
        urls.push(draft.url);
        continue;
      }
      const uploaded = await uploadPhoto(draft);
      if (!uploaded) {
        setSubmitting(false);
        setSubmitError('Prijava nije poslata jer fotografija nije otpremljena. Pokušajte ponovo.');
        return;
      }
      urls.push(uploaded);
    }

    const input: NewReportInput = {
      title: title.trim(),
      description: description.trim(),
      category: category as Category,
      latitude: composeLocation.latitude,
      longitude: composeLocation.longitude,
      address: address.trim() || undefined,
      createdByName: auth.user?.displayName ?? undefined,
    };

    try {
      if (isFirebaseConfigured) {
        const report = await createReportRecord(input, urls);
        addCreatedReport(report);
        notify('success', 'Prijava je objavljena i vidljiva je na mapi.');
      } else {
        const report = addDemoReport(input, urls);
        addCreatedReport(report);
        notify('success', 'Prijava je sačuvana lokalno. Demo režim.');
      }
    } catch (error) {
      const base = toSerbianError(
        error,
        'Prijava nije sačuvana. Proverite vezu i pokušajte ponovo.',
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
    setCollapseSignal((value) => value + 1);
    if (composeLocation) {
      flyTo(composeLocation, undefined, { accountForDrawer: true });
      return;
    }
    const map = mapRef.current;
    map?.flyTo([APP.center.latitude, APP.center.longitude], 14, { duration: 0.5 });
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      notify('error', 'Vaš pregledač ne podržava određivanje lokacije.');
      return;
    }
    if (userPosition) {
      setComposeLocation({
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      });
      setCollapseSignal((value) => value + 1);
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
        setCollapseSignal((value) => value + 1);
        flyTo(point, 17, { accountForDrawer: true });
        if (!isInServiceArea(point)) {
          notify('error', 'Vaša lokacija je izvan Novog Sada.');
        }
      },
      () => {
        setLocating(false);
        notify('error', 'Lokaciju nije moguće odrediti. Izaberite tačku na mapi.');
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const footer =
    confirmClose && !submitting ? (
      <div className="confirm-panel">
        <p>Otkazati prijavu? Uneti podaci neće biti sačuvani.</p>
        <div className="confirm-panel__actions">
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => setConfirmClose(false)}
          >
            Nastavi unos
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={cancelCompose}>
            Otkaži prijavu
          </button>
        </div>
      </div>
    ) : (
      <div className="compose-foot">
        {submitError ? (
          <div className="form-alert" role="alert">
            <TriangleAlert size={15} aria-hidden="true" />
            <p>{submitError}</p>
          </div>
        ) : null}
        <div className="compose-foot__row">
          <button
            type="button"
            className="btn btn--quiet"
            onClick={requestClose}
            disabled={submitting}
          >
            Otkaži
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? <Spinner size={15} /> : null}
            {submitting ? 'Objavljujem…' : 'Objavi prijavu'}
          </button>
        </div>
        <p className="compose-foot__note">
          Prijava je javna. Ne unosite lične podatke. {isFirebaseConfigured ? '' : 'Demo režim: prijava se čuva samo u ovom pregledaču.'}
        </p>
      </div>
    );

  return (
    <Drawer
      label="Nova prijava"
      onClose={requestClose}
      footer={footer}
      className="drawer--compose"
      collapseSignal={collapseSignal}
    >
      <div className="compose-head">
        <span className="eyebrow">Nova prijava</span>
        <span className="compose-head__hint">
          {isFirebaseConfigured ? 'Prijava se objavljuje odmah' : 'Demo režim'}
        </span>
      </div>

      <h2 className="compose-title">Prijavite problem na mapi</h2>
      <p className="compose-sub">
        Izaberite tačnu lokaciju, opišite šta nedostaje i dodajte fotografiju ako je imate.
      </p>

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
            <span className="form-section__done" aria-label="Lokacija je izabrana">
              <Check size={12} aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className={`location-pick${composeLocation ? ' is-set' : ''}${outsideArea ? ' is-error' : ''}`}>
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
                : 'Kliknite na mapu da postavite marker.'}
            </span>
          </div>
          <button
            type="button"
            id="compose-map-button"
            className="btn btn--quiet btn--sm"
            onClick={focusMap}
          >
            {composeLocation ? 'Pomeri' : 'Izaberi'}
          </button>
        </div>

        <div className="location-actions">
          <button
            type="button"
            className="link-btn"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? <Spinner size={13} /> : <Navigation size={13} aria-hidden="true" />}
            {locating ? 'Traženje lokacije…' : 'Koristi moju lokaciju'}
          </button>
          <span className="location-actions__hint">Tačka se postavlja klikom na mapu.</span>
        </div>

        {errors.location ? (
          <p className="field__error" role="alert">
            {errors.location}
          </p>
        ) : null}
        {outsideArea && !errors.location ? (
          <p className="field__error" role="alert">
            Izabrana tačka je izvan Novog Sada.
          </p>
        ) : null}
      </section>

      <section className="form-section" aria-labelledby="compose-details-label">
        <div className="form-section__head">
          <span className="form-section__num">02</span>
          <h3 id="compose-details-label">Detalji</h3>
        </div>

        <div className={`field${errors.title ? ' has-error' : ''}`}>
          <div className="field__top">
            <label htmlFor="report-title">Naslov</label>
            <span className="field__counter">
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            id="report-title"
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="Na primer: Polomljena klupa u Dunavskom parku"
            onChange={(event) => {
              setTitle(event.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
            }}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'error-title' : undefined}
            disabled={submitting}
            autoComplete="off"
          />
          {errors.title ? (
            <p className="field__error" id="error-title" role="alert">
              {errors.title}
            </p>
          ) : null}
        </div>

        <fieldset className={`field field--fieldset${errors.category ? ' has-error' : ''}`}>
          <legend className="field__label">Kategorija</legend>
          <div className="category-grid">
            {CATEGORIES.map((option, index) => (
              <label
                key={option.id}
                className={`category-option${category === option.id ? ' is-active' : ''}`}
                data-category={option.id}
              >
                <input
                  id={index === 0 ? 'category-waste' : undefined}
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
          {errors.category ? (
            <p className="field__error" role="alert">
              {errors.category}
            </p>
          ) : null}
        </fieldset>

        <div className={`field${errors.description ? ' has-error' : ''}`}>
          <div className="field__top">
            <label htmlFor="report-description">Opis problema</label>
            <span className="field__counter">
              {description.length}/{DESC_MAX}
            </span>
          </div>
          <textarea
            id="report-description"
            rows={5}
            value={description}
            maxLength={DESC_MAX}
            placeholder="Šta je oštećeno ili zapušteno? Koliko je prostor pristupačan? Šta bi trebalo uraditi?"
            onChange={(event) => {
              setDescription(event.target.value);
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'error-description' : 'hint-description'}
            disabled={submitting}
          />
          <p className="field__hint" id="hint-description">
            Najmanje {DESC_MIN} znakova. Bez ličnih podataka i bez optužbi.
          </p>
          {errors.description ? (
            <p className="field__error" id="error-description" role="alert">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="field">
          <div className="field__top">
            <label htmlFor="report-address">
              Adresa ili orijentir <span className="field__optional">opciono</span>
            </label>
            <span className="field__counter">{address.length}/{LIMITS.addressMax}</span>
          </div>
          <input
            id="report-address"
            type="text"
            value={address}
            maxLength={LIMITS.addressMax}
            placeholder="Na primer: Dunavski park, ulaz sa Keja"
            onChange={(event) => setAddress(event.target.value)}
            disabled={submitting}
            autoComplete="off"
          />
          <p className="field__hint">Pomaže drugima da pronađu mesto bez otvaranja mape.</p>
        </div>
      </section>

      <section className="form-section" aria-labelledby="compose-photos-label">
        <div className="form-section__head">
          <span className="form-section__num">03</span>
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
            <div className="photo-grid">
              {photos.map((photo) => (
                <div key={photo.id} className={`photo-draft photo-draft--${photo.status}`}>
                  <img src={photo.previewUrl} alt="" />
                  {photo.status === 'uploading' ? (
                    <span className="photo-draft__bar">
                      <span style={{ width: `${photo.progress}%` }} />
                    </span>
                  ) : null}
                  {photo.status === 'done' ? (
                    <span className="photo-draft__done" aria-label="Fotografija je otpremljena">
                      <Check size={11} aria-hidden="true" />
                    </span>
                  ) : null}
                  {photo.status === 'error' ? (
                    <span className="photo-draft__error" title={photo.error}>
                      <TriangleAlert size={12} aria-hidden="true" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="photo-draft__remove"
                    onClick={() => removePhoto(photo)}
                    aria-label="Ukloni fotografiju"
                    disabled={submitting}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              ))}

              {photos.length < LIMITS.imagesMax ? (
                <button
                  type="button"
                  id="compose-photo-button"
                  className="photo-add"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <ImagePlus size={18} aria-hidden="true" />
                  <span>Dodaj</span>
                  <span className="photo-add__count">
                    {photos.length}/{LIMITS.imagesMax}
                  </span>
                </button>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={LIMITS.imageTypes.join(',')}
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />

            <p className="field__hint">
              Najviše {LIMITS.imagesMax} fotografije, do{' '}
              {Math.round(LIMITS.imageMaxBytes / (1024 * 1024))} MB. JPG, PNG ili WebP.
              Fotografije se otpremaju pri objavljivanju.
            </p>
          </>
        )}

        {errors.photos ? (
          <p className="field__error" role="alert">
            {errors.photos}
          </p>
        ) : null}

        {photos.some((photo) => photo.error) ? (
          <p className="field__error" role="alert">
            Neka fotografija nije otpremljena. Uklonite je ili pokušajte ponovo.
          </p>
        ) : null}
      </section>

      <div className="compose-review">
        <p className="eyebrow">Pre objave</p>
        <p>
          Prijava se prikazuje na javnoj mapi. Status „Nova” znači da je poslata, ne da je
          proverena. Administratori mogu da je povežu sa akcijom čišćenja.
        </p>
      </div>
    </Drawer>
  );
}
