import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useApp } from '../state/app-context';

export function Toasts() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
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
            onClick={() => dismissToast(toast.id)}
            aria-label="Zatvori obaveštenje"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
