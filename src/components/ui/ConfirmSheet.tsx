import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * One shape for every "are you sure?": the screen dims and a panel with the
 * question and two large buttons comes up. The safe choice comes first and
 * gets the focus; the risky one is red.
 */
export function ConfirmSheet({
  title,
  message,
  keepLabel,
  confirmLabel,
  onKeep,
  onConfirm,
}: {
  title: string;
  message: string;
  keepLabel: string;
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const keepButton = useRef<HTMLButtonElement>(null);
  const latestOnKeep = useRef(onKeep);

  useEffect(() => {
    latestOnKeep.current = onKeep;
  });

  useEffect(() => {
    keepButton.current?.focus();
    // Capture phase, so Escape closes only this question and not the panel under it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      latestOnKeep.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return createPortal(
    <div className="confirm-sheet">
      <div className="confirm-sheet__backdrop" onClick={onKeep} />
      <div
        className="confirm-sheet__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
      >
        <h2 id={`${id}-title`} className="confirm-sheet__title">
          {title}
        </h2>
        <p id={`${id}-text`} className="confirm-sheet__text">
          {message}
        </p>
        <div className="confirm-sheet__actions">
          <button ref={keepButton} type="button" className="btn btn--primary" onClick={onKeep}>
            {keepLabel}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
