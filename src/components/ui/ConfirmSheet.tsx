import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalFocus } from '../../hooks/useModalFocus';

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
  const panel = useRef<HTMLDivElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);

  // Tab stays in the question, Escape keeps going, and focus then goes back.
  useModalFocus(panel, onKeep, {
    initialFocus: () => keepButton.current,
    fallbackFocus: () => document.querySelector<HTMLElement>('.drawer'),
  });

  return createPortal(
    <div className="confirm-sheet">
      <div className="confirm-sheet__backdrop" onClick={onKeep} />
      <div
        ref={panel}
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
