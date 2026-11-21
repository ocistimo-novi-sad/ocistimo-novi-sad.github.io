import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { LIMITS } from '../../config';
import { toSerbianError } from '../../services/errors';
import {
  cleanPublicName,
  isReservedPublicName,
  publicNameLength,
} from '../../services/profile';
import { useApp } from '../../state/app-context';
import { Spinner } from '../ui/EmptyState';
import { Modal } from './Modal';

/**
 * Chooses the public author name (#161). The first sign-in opens it once; the
 * account menu opens it later under "Lični podaci".
 */
export function ProfileDialog({ mode }: { mode: 'first' | 'edit' }) {
  const { auth, closeModal, savePublicName } = useApp();
  const [name, setName] = useState(auth.publicName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The first-run dialog cannot be skipped, but a failed save must not trap
  // the person in it (for example, before the Firestore rules are deployed).
  const [canClose, setCanClose] = useState(false);

  const first = mode === 'first';
  const clean = cleanPublicName(name);

  const submit = async () => {
    if (!clean) {
      setError('Unesi javno ime.');
      document.getElementById('public-name')?.focus();
      return;
    }
    if (publicNameLength(clean) < LIMITS.publicNameMin) {
      setError(`Javno ime mora imati najmanje ${LIMITS.publicNameMin} znaka.`);
      document.getElementById('public-name')?.focus();
      return;
    }
    if (isReservedPublicName(clean)) {
      setError('Ovo ime je rezervisano. Izaberi drugo.');
      document.getElementById('public-name')?.focus();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await savePublicName(clean);
      closeModal();
    } catch (saveError) {
      setError(toSerbianError(saveError, 'Ime nije sačuvano. Pokušaj ponovo.'));
      setCanClose(true);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Lični podaci"
      description="Ime koje drugi vide uz tvoje prijave i akcije."
      size="sm"
      dismissible={!first || canClose}
      onClose={() => {
        if (!saving) closeModal();
      }}
      footer={
        <div className="modal-actions">
          {first && !canClose ? (
            <span className="modal-foot-note">Možeš ga kasnije promeniti u meniju naloga.</span>
          ) : (
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={closeModal}
              disabled={saving}
            >
              {first ? 'Zatvori' : 'Otkaži'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void submit()}
            disabled={saving}
          >
            {saving ? <Spinner size={13} /> : null}
            {saving ? 'Čuvam…' : 'Sačuvaj'}
          </button>
        </div>
      }
    >
      <div className="notice notice--info">
        <UserRound size={14} aria-hidden="true" />
        <p>Ovo ime će se koristiti kao ime autora za sve tvoje unose.</p>
      </div>

      <div className={`field${error ? ' has-error' : ''}`}>
        <div className="field__top">
          <label htmlFor="public-name">Javno ime</label>
          <span className="field__counter">
            {publicNameLength(clean)}/{LIMITS.publicNameMax}
          </span>
        </div>
        <input
          id="public-name"
          type="text"
          value={name}
          maxLength={LIMITS.publicNameMax * 2}
          required
          autoComplete="nickname"
          placeholder="Na primer: Komšija sa Limana"
          onChange={(event) => {
            // Count characters, not UTF-16 units, so an emoji is one character.
            setName(
              Array.from(event.target.value).slice(0, LIMITS.publicNameMax).join(''),
            );
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'public-name-error' : 'public-name-hint'}
          disabled={saving}
        />
        <p className="field__hint" id="public-name-hint">
          Prikazuje se javno. Google nalog i mejl adresa ostaju privatni.
        </p>
        {error ? (
          <p className="field__error" id="public-name-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
