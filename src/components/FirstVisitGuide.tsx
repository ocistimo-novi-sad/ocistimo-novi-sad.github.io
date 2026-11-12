import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useApp } from '../state/app-context';

const STORAGE_KEY = 'kim-guide-done';
/** Dispatched on window to show the guide again, e.g. from "O projektu". */
export const GUIDE_EVENT = 'kim:guide';

/** Each step highlights the element marked with the matching data-guide attribute. */
const STEPS = [
  {
    target: 'create',
    text: 'Primećuješ problem u kraju? Dodirni „Prijavi“, označi mesto na mapi i opiši problem. Ako imaš fotografiju, dodaj je.',
  },
  {
    target: 'layer',
    text: 'Izaberi „Prijave“ da vidiš koje su probleme drugi prijavili ili „Akcije“ da vidiš gde se organizuju sanacije problema.',
  },
  {
    target: 'list',
    text: 'Otvori „Listu“ da pregledaš prijave ili akcije na jednom mestu. Koristi pretragu i filtere da brže pronađeš ono što tražiš.',
  },
];

function guideSeen(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Storage blocked: never show the guide rather than show it every time.
    return true;
  }
}

function markGuideSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Private mode or blocked storage; the guide just shows again next time.
  }
}

function findTarget(name: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`)].find(
      (element) => element.offsetParent !== null,
    ) ?? null
  );
}

const PAD = 6;

/** A three-step tour of the phone layout, shown on the first visit. */
export function FirstVisitGuide() {
  const isMobile = useIsMobile();
  const { selectedReport, selectedAction, composeOpen, modal } = useApp();
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const busy = Boolean(selectedReport || selectedAction || composeOpen || modal);

  // First visit: start once the map has had a moment to appear.
  useEffect(() => {
    if (!isMobile || busy || step !== null || guideSeen()) return;
    const timer = window.setTimeout(() => setStep(0), 700);
    return () => window.clearTimeout(timer);
  }, [isMobile, busy, step]);

  useEffect(() => {
    const restart = () => setStep(0);
    window.addEventListener(GUIDE_EVENT, restart);
    return () => window.removeEventListener(GUIDE_EVENT, restart);
  }, []);

  useLayoutEffect(() => {
    if (step === null) return;
    const measure = () => setBox(findTarget(STEPS[step].target)?.getBoundingClientRect() ?? null);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  if (step === null || !isMobile) return null;

  const finish = () => {
    markGuideSeen();
    setStep(null);
  };
  const last = step === STEPS.length - 1;

  // The bubble goes on the side of the highlighted element with more room.
  let bubbleStyle: CSSProperties = { top: '30%' };
  if (box) {
    bubbleStyle =
      box.top > window.innerHeight / 2
        ? { bottom: window.innerHeight - box.top + PAD + 12 }
        : { top: box.bottom + PAD + 12 };
  }

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label="Kratak vodič">
      {box ? (
        <div
          className="guide__spot"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      ) : (
        <div className="guide__dim" />
      )}
      <div className="guide__bubble" style={bubbleStyle} key={step}>
        <p className="guide__step">
          Korak {step + 1} od {STEPS.length}
        </p>
        <p className="guide__text">{STEPS[step].text}</p>
        <div className="guide__row">
          <button type="button" className="btn btn--quiet btn--sm" onClick={finish}>
            Preskoči
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => (last ? finish() : setStep(step + 1))}
            autoFocus
          >
            {last ? 'Gotovo' : 'Dalje'}
          </button>
        </div>
      </div>
    </div>
  );
}
