import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { focusableIn, useModalFocus } from '../../hooks/useModalFocus';

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  initialFocus,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Where focus starts; by default the first field the user can see. */
  initialFocus?: () => HTMLElement | null | undefined;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdrop = useBackdropClose(onClose);

  useModalFocus(panelRef, onClose, {
    initialFocus: () =>
      initialFocus?.() ??
      focusableIn(panelRef.current).find((element) => element.matches('input, textarea, select')),
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="modal-overlay" {...backdrop}>
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modal__head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Zatvori">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
