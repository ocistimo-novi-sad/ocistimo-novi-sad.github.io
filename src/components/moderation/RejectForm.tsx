import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '../../config';
import { Spinner } from '../ui/EmptyState';
import { FieldError } from '../ui/FormErrors';

/**
 * Inline rejection form. Lives inside the review pane (and the report drawer)
 * rather than in its own modal, so Escape and focus stay with one dialog.
 */
export function RejectForm({
  heading,
  presets,
  busy,
  onCancel,
  onSubmit,
}: {
  heading: string;
  presets: string[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < LIMITS.rejectReasonMin) {
      setError(`Razlog mora imati najmanje ${LIMITS.rejectReasonMin} znakova.`);
      fieldRef.current?.focus();
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="reject-form">
      <p className="reject-form__title">{heading}</p>
      <p className="reject-form__hint" id="reject-reason-hint">
        Najmanje {LIMITS.rejectReasonMin} znakova. Autor će videti razlog uz svoju prijavu.
      </p>

      <div className="preset-row" role="group" aria-label="Česti razlozi">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`preset-chip${reason === preset ? ' is-used' : ''}`}
            onClick={() => {
              setReason(preset);
              setError(null);
            }}
            aria-disabled={busy || undefined}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className={`field${error ? ' has-error' : ''}`}>
        <div className="field__top">
          <label htmlFor="reject-reason">Razlog odbijanja</label>
          <span className="field__counter">
            {reason.length}/{LIMITS.rejectReasonMax}
          </span>
        </div>
        <textarea
          id="reject-reason"
          ref={fieldRef}
          rows={3}
          value={reason}
          maxLength={LIMITS.rejectReasonMax}
          placeholder="Šta autor treba da ispravi da bi prijava bila objavljena?"
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'reject-reason-hint reject-reason-error' : 'reject-reason-hint'}
          disabled={busy}
        />
        {error ? (
          <FieldError id="reject-reason-error" alert>
            {error}
          </FieldError>
        ) : null}
      </div>

      <div className="reject-form__actions">
        <button type="button" className="btn btn--quiet btn--sm" onClick={onCancel} aria-disabled={busy || undefined}>
          Odustani
        </button>
        <button type="button" className="btn btn--danger btn--sm" onClick={submit} aria-disabled={busy || undefined}>
          {busy ? <Spinner size={12} /> : null}
          Odbij
        </button>
      </div>
    </div>
  );
}
