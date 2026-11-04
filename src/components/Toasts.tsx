import { useRef } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { canFocus } from '../hooks/useModalFocus';
import { useApp } from '../state/app-context';

export function Toasts() {
  const { toasts, dismissToast, pauseToasts, resumeToasts } = useApp();
  // Where focus was before it moved to a toast, so closing one puts it back.
  const before = useRef<HTMLElement | null>(null);

  return (
    <div
      className="toasts"
      aria-live="polite"
      onMouseEnter={pauseToasts}
      onMouseLeave={resumeToasts}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          before.current = event.relatedTarget as HTMLElement | null;
          pauseToasts();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resumeToasts();
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <span className="toast__icon" aria-hidden="true">
            {toast.tone === 'success' ? (
              <CircleCheck size={16} />
            ) : toast.tone === 'error' ? (
              <CircleAlert size={16} />
            ) : (
              <Info size={16} />
            )}
          </span>
          <p>{toast.message}</p>
          <button
            type="button"
            className="toast__close"
            onClick={() => {
              dismissToast(toast.id);
              if (canFocus(before.current)) before.current.focus();
            }}
            aria-label="Zatvori obaveštenje"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
