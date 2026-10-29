import { useEffect, useState } from 'react';
import { ShieldCheck, TriangleAlert } from 'lucide-react';
import { toSerbianError } from '../../services/errors';
import { useApp } from '../../state/app-context';
import { Modal } from './Modal';
import { Spinner } from '../ui/EmptyState';

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.8c2.3-2.1 3.6-5.1 3.6-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-3c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l3.9-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l3.9 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

export function AuthDialog({
  intent,
}: {
  intent: 'create' | 'flag' | 'generic';
}) {
  const { auth, closeModal, onSignedIn } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user) onSignedIn();
  }, [auth.user, onSignedIn]);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.signIn();
    } catch (signInError) {
      setError(toSerbianError(signInError, 'Prijava nije uspela. Pokušajte ponovo.'));
    } finally {
      setBusy(false);
    }
  };

  const reason =
    intent === 'create'
      ? 'Prijava problema je vezana za nalog kako bi zajednica mogla da odgovori na pitanja i spreči zloupotrebu.'
      : intent === 'flag'
        ? 'Prijava neprikladnog sadržaja je vezana za nalog kako bi administratori mogli da provere slučaj.'
        : 'Prijavite se da biste objavljivali prijave i prijavili neprikladan sadržaj.';

  return (
    <Modal
      title="Prijavite se da nastavite"
      description="Pregled prijava i akcija je javan, bez naloga."
      size="sm"
      onClose={closeModal}
      footer={
        <div className="auth-foot">
          <span>Registracija nije potrebna. Koristi se Google nalog.</span>
          <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
            Otkaži
          </button>
        </div>
      }
    >
      <div className="auth-card">
        <div className="auth-card__mark" aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
        <p className="auth-card__text">{reason}</p>

        {auth.isAdmin ? (
          <p className="auth-card__admin">
            <ShieldCheck size={13} aria-hidden="true" /> Prijavljeni ste kao administrator.
          </p>
        ) : null}

        {error ?? auth.signInError ? (
          <div className="form-alert" role="alert">
            <TriangleAlert size={15} aria-hidden="true" />
            <p>{error ?? auth.signInError}</p>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn--google"
          onClick={() => void signIn()}
          disabled={busy || !auth.configured}
        >
          {busy ? <Spinner size={16} /> : <GoogleMark />}
          {busy ? 'Prijavljivanje…' : 'Nastavi sa Google'}
        </button>

        {!auth.configured ? (
          <p className="auth-card__warning">
            Firebase nije povezan, pa prijava trenutno nije moguća. Aplikacija radi u demo režimu.
          </p>
        ) : null}

        <p className="auth-card__privacy">
          Od Google naloga preuzimamo ime i profilnu sliku. Mejl adresa nije javno prikazana uz
          prijave. Detalji su u odeljku „O projektu”.
        </p>
      </div>
    </Modal>
  );
}
