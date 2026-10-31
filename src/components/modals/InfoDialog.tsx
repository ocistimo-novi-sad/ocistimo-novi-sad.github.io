import type { ReactNode } from 'react';
import { Database, Image as ImageIcon, LockKeyhole, Map, ShieldCheck } from 'lucide-react';
import { APP, ROLE_LABELS } from '../../config';
import { isFirebaseConfigured, firebaseProjectId } from '../../services/firebase';
import { imageStorage, imagesEnabled } from '../../services/images';
import { useApp } from '../../state/app-context';
import { Modal } from './Modal';

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="status-row">
      <span className="status-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="status-row__label">{label}</span>
      <span className={`status-row__value${ok ? ' is-ok' : ' is-demo'}`}>
        <span className="status-dot" aria-hidden="true" />
        {value}
      </span>
    </div>
  );
}

export function InfoDialog() {
  const { closeModal, auth } = useApp();

  return (
    <Modal
      title="O projektu Kuka i Motika"
      description="Mapa problema i zajedničkih akcija čišćenja u Novom Sadu."
      size="lg"
      onClose={closeModal}
      footer={
        <div className="modal-actions">
          <span className="modal-foot-note">Projekat je otvoren za poboljšanja.</span>
          <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
            Zatvori
          </button>
        </div>
      }
    >
      <div className="info-hero">
        <span className="eyebrow">Novi Sad · Zajednica</span>
        <h3>Mapa problema, ne mapa žalbi.</h3>
        <p>
          Kuka i Motika okuplja prijave oštećenih, prljavih i zapuštenih javnih prostora i
          povezuje ih sa stvarnim akcijama čišćenja. Cilj nije da se problemi samo popišu, već da se
          vide, provere i reše.
        </p>
      </div>

      <ol className="info-steps">
        <li>
          <span className="info-steps__num">01</span>
          <div>
            <strong>Primetite problem</strong>
            <p>Klupa, deponija, grafit ili zarasla staza, sve što je u javnom prostoru.</p>
          </div>
        </li>
        <li>
          <span className="info-steps__num">02</span>
          <div>
            <strong>Postavite tačku na mapu</strong>
            <p>Dodajte opis i fotografiju. Bez fotografije prijava i dalje važi.</p>
          </div>
        </li>
        <li>
          <span className="info-steps__num">03</span>
          <div>
            <strong>Uključite se u akciju</strong>
            <p>Administratori povezuju prijave sa terminom čišćenja i mestom okupljanja.</p>
          </div>
        </li>
      </ol>

      <div className="info-block">
        <h4>Tehnički status ovog sajta</h4>
        <div className="status-list">
          <StatusRow
            icon={<Database size={14} />}
            label="Baza podataka"
            value={
              isFirebaseConfigured
                ? `Firestore${firebaseProjectId ? ` · ${firebaseProjectId}` : ''}`
                : 'Demo režim · samo ovaj pregledač'
            }
            ok={isFirebaseConfigured}
          />
          <StatusRow
            icon={<ImageIcon size={14} />}
            label="Fotografije"
            value={imagesEnabled ? `${imageStorage.label} · otpremanje omogućeno` : 'Nije podešeno'}
            ok={imagesEnabled}
          />
          <StatusRow
            icon={<LockKeyhole size={14} />}
            label="Prijava"
            value={auth.configured ? 'Google nalog' : 'Demo režim · bez naloga'}
            ok={auth.configured}
          />
          <StatusRow
            icon={<ShieldCheck size={14} />}
            label="Vaša uloga"
            value={
              !auth.configured
                ? 'Nije primenljivo'
                : auth.user
                  ? ROLE_LABELS[auth.role]
                  : 'Posetilac'
            }
            ok={Boolean(auth.user)}
          />
        </div>
        {!isFirebaseConfigured ? (
          <p className="info-hint">
            Podaci u demo režimu se ne čuvaju u bazi. Uputstvo za povezivanje Firebase projekta
            nalazi se u README fajlu repozitorijuma, a vrednosti se unose u <code>.env.local</code>{' '}
            ili u GitHub Actions promenljive.
          </p>
        ) : null}
      </div>

      <div className="info-block">
        <h4>Besplatan plan i ograničenja</h4>
        <p>
          Aplikacija je napravljena za Firebase Spark (besplatan) plan i statički hosting na GitHub
          Pages. Firebase Storage za nove projekte zahteva plaćeni Blaze plan, zato fotografije idu
          preko Cloudinary besplatnog plana, a aplikacija radi i bez njega. Detalji o limitima i
          podešavanju su u README-u.
        </p>
      </div>

      <div className="info-block">
        <h4>Podaci i privatnost</h4>
        <p>
          Prijave su javne. Uz prijavu se prikazuje ime iz naloga, ali ne i mejl adresa. Koordinate
          su numeričke i javne. Pravila pristupa u Firestore-u sprečavaju obične korisnike da menjaju
          statuse ili objavljuju zvanične akcije.
        </p>
      </div>

      <p className="info-links">
        <Map size={13} aria-hidden="true" />
        Mapa i podaci:{' '}
        <a href={APP.openStreetMap} target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          autorska prava
        </a>
      </p>
    </Modal>
  );
}
