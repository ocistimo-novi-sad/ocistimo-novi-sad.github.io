import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useModalFocus } from '../hooks/useModalFocus';
import { useApp } from '../state/app-context';

const STORAGE_KEY = 'kim-guide-done';
/** Dispatched on window to show the guide again, e.g. from "O projektu". */
export const GUIDE_EVENT = 'kim:guide';

/** Each step highlights the element marked with the matching data-guide attribute. */
const STEPS = [
  {
    target: 'create',
    text: 'Vidiš problem u kraju? Dugme „Prijavi“ u sredini donje trake otvara formu: tačka na mapi, par reči i fotografija ako je imaš.',
  },
  {
    target: 'layer',
    text: 'Prijave su problemi koje su ljudi primetili. Akcije su okupljanja za čišćenje. „Prijave“ i „Akcije“ na vrhu biraju šta mapa prikazuje.',
  },
  {
    target: 'list',
    text: 'Dugme „Lista“ prikazuje ista mesta kao spisak, sa pretragom i filterima.',
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

  return <GuideDialog step={step} box={box} onNext={() => setStep(step + 1)} onFinish={finish} />;
}

/** The dimmed screen and the bubble. Keyboard focus stays inside while it is open. */
function GuideDialog({
  step,
  box,
  onNext,
  onFinish,
}: {
  step: number;
  box: DOMRect | null;
  onNext: () => void;
  onFinish: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  // Escape skips the guide. On a first visit nothing had focus before, so it
  // goes to the report button, the first thing the guide points at.
  useModalFocus(dialog, onFinish, {
    initialFocus: () => primary.current,
    fallbackFocus: () => findTarget('create'),
  });
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
    <div
      ref={dialog}
      className="guide"
      role="dialog"
      aria-modal="true"
      aria-label="Kratak vodič"
      aria-describedby="guide-text"
    >
      {box ? (
        <div
          key="spot"
          className="guide__spot"
          style={{
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            transform: `translate(${box.left - PAD}px, ${box.top - PAD}px)`,
          }}
        />
      ) : (
        <div key="dim" className="guide__dim" />
      )}
      <div className="guide__bubble" style={bubbleStyle} key={step}>
        <p className="guide__step">
          Korak {step + 1} od {STEPS.length}
        </p>
        <p className="guide__text" id="guide-text">
          {STEPS[step].text}
        </p>
        <div className="guide__row">
          <button type="button" className="btn btn--quiet btn--sm" onClick={onFinish}>
            Preskoči
          </button>
          <button
            ref={primary}
            type="button"
            className="btn btn--primary btn--sm"
            aria-describedby="guide-text"
            onClick={() => (last ? onFinish() : onNext())}
            autoFocus
          >
            {last ? 'Gotovo' : 'Dalje'}
          </button>
        </div>
      </div>
    </div>
  );
}
