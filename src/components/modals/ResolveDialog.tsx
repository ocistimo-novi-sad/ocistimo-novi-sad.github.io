import { useState } from 'react';
import { CheckCircle2, ImageOff, TriangleAlert } from 'lucide-react';
import { LIMITS } from '../../config';
import { usePhotoUploads } from '../../hooks/usePhotoUploads';
import { toSerbianError } from '../../services/errors';
import { imagesEnabled, optimizedImageUrl } from '../../services/images';
import { useApp } from '../../state/app-context';
import { EmptyState, Spinner } from '../ui/EmptyState';
import { PhotoPicker } from '../ui/PhotoPicker';
import { Modal } from './Modal';

/** The author reports a problem as fixed, with "after" photos as proof. */
export function ResolveDialog({ reportId }: { reportId: string }) {
  const { myReports, selectedReport, submitReportResolution, closeModal } = useApp();
  const report =
    myReports.find((item) => item.id === reportId) ??
    (selectedReport?.id === reportId ? selectedReport : null);

  const { photos, addFiles, removePhoto, uploadAll } = usePhotoUploads();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!report || !imagesEnabled) {
    return (
      <Modal title="Označi kao sanirano" size="sm" onClose={closeModal}>
        <EmptyState
          icon={<ImageOff size={20} />}
          title={report ? 'Fotografije nisu podešene' : 'Prijava nije pronađena'}
          description={
            report
              ? 'Za dokaz sanacije potrebna je fotografija, a otpremanje fotografija nije podešeno za ovaj sajt. Javite se moderatoru.'
              : 'Osvežite „Moje prijave” i pokušajte ponovo.'
          }
          action={
            <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
              Zatvori
            </button>
          }
        />
      </Modal>
    );
  }

  const submit = async () => {
    if (photos.length === 0) {
      setError('Dodajte bar jednu fotografiju sadašnjeg stanja.');
      document.getElementById('resolve-photo-button')?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);

    const upload = await uploadAll();
    if (upload.error !== undefined) {
      setSubmitting(false);
      setError(`Fotografija nije otpremljena: ${upload.error}`);
      return;
    }

    try {
      await submitReportResolution(report, upload.urls, note.trim());
      closeModal();
    } catch (submitError) {
      setError(
        toSerbianError(
          submitError,
          'Sanacija nije poslata. Fotografije su otpremljene i neće biti ponovo poslate.',
        ),
      );
      setSubmitting(false);
    }
  };

  const before = report.imageUrls[0];
  const resent = report.resolution?.state === 'rejected';

  return (
    <Modal
      title="Označi kao sanirano"
      description="Pošaljite fotografiju sadašnjeg stanja. Kada moderator potvrdi, prijava postaje zelena."
      size="md"
      onClose={() => {
        if (!submitting) closeModal();
      }}
      footer={
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={closeModal}
            disabled={submitting}
          >
            Otkaži
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? <Spinner size={13} /> : <CheckCircle2 size={13} aria-hidden="true" />}
            {submitting ? 'Šaljem…' : 'Pošalji na potvrdu'}
          </button>
        </div>
      }
    >
      <p className="resolve__report">{report.title}</p>

      {resent && report.resolution?.rejectionReason ? (
        <div className="reject-note" role="note">
          <p className="reject-note__title">Prethodni dokaz nije potvrđen</p>
          <p className="reject-note__reason">{report.resolution.rejectionReason}</p>
        </div>
      ) : null}

      <div className="resolve__pair">
        <div className="resolve__side">
          <span className="before-after__tag">Pre</span>
          {before ? (
            <img
              className="resolve__before"
              src={optimizedImageUrl(before, 400)}
              alt="Fotografija iz prijave"
            />
          ) : (
            <span className="before-after__empty resolve__before">
              <ImageOff size={16} aria-hidden="true" />
              Prijava nema fotografiju
            </span>
          )}
        </div>
        <div className="resolve__side">
          <span className="before-after__tag before-after__tag--after">Posle</span>
          <PhotoPicker
            photos={photos}
            onAdd={(files) => {
              const message = addFiles(files);
              setError(message);
            }}
            onRemove={removePhoto}
            disabled={submitting}
            addButtonId="resolve-photo-button"
            addLabel="Dodaj sliku"
          />
        </div>
      </div>

      <div className="field">
        <div className="field__top">
          <label htmlFor="resolve-note">
            Napomena <span className="field__optional">opciono</span>
          </label>
          <span className="field__counter">
            {note.length}/{LIMITS.resolutionNoteMax}
          </span>
        </div>
        <textarea
          id="resolve-note"
          rows={3}
          value={note}
          maxLength={LIMITS.resolutionNoteMax}
          placeholder="Na primer: Očistili smo u subotu, bilo nas je osmoro, odvezeno je 12 džakova."
          onChange={(event) => setNote(event.target.value)}
          disabled={submitting}
        />
      </div>

      {error ? (
        <div className="form-alert" role="alert">
          <TriangleAlert size={15} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}
    </Modal>
  );
}
