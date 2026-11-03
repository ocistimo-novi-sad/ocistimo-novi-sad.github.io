import { Map } from 'lucide-react';
import { APP } from '../../config';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useApp } from '../../state/app-context';
import { GUIDE_EVENT } from '../FirstVisitGuide';
import { Modal } from './Modal';

export function InfoDialog() {
  const { closeModal } = useApp();
  const isMobile = useIsMobile();

  return (
    <Modal
      title="O projektu Kuka i Motika"
      description="Prijavi problem u svom kraju. Zajedno ga rešavamo."
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
        <span className="eyebrow">Zajednica</span>
        <h3>Mapa problema, ne mapa žalbi.</h3>
        <p>
          Kuka i Motika je mapa problema u javnom prostoru. Svako može da prijavi problem.
          Moderatori zajednice zatim organizuju akcije čišćenja, a svako može da im se pridruži.
        </p>
        <p>
          Piši na <a href="mailto:kontakt@kukaimotika.rs">kontakt@kukaimotika.rs</a> da prijaviš
          koordinatora tvoje zajednice.
        </p>
      </div>

      <ol className="info-steps">
        <li>
          <span className="info-steps__num">01</span>
          <div>
            <strong>Prijavi problem</strong>
            <p>
              Klupa, deponija, grafit ili zarasla staza. Označi mesto na mapi i dodaj opis.
              Fotografija pomaže, ali nije obavezna.
            </p>
          </div>
        </li>
        <li>
          <span className="info-steps__num">02</span>
          <div>
            <strong>Moderatori organizuju akciju</strong>
            <p>
              Moderatori zajednice spajaju prijave sa iste lokacije i objavljuju akciju sa terminom
              i mestom okupljanja.
            </p>
          </div>
        </li>
      </ol>

      {isMobile ? (
        <button
          type="button"
          className="link-btn info-guide"
          onClick={() => {
            closeModal();
            window.dispatchEvent(new Event(GUIDE_EVENT));
          }}
        >
          Pokreni kratak vodič kroz aplikaciju
        </button>
      ) : null}

      <div className="info-block">
        <h3>Podaci i privatnost</h3>
        <p>Prijave su javne. Uz prijavu se prikazuje ime iz naloga, ali ne i mejl adresa.</p>
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
