import { useState } from 'react';
import { Flag, TriangleAlert } from 'lucide-react';
import { FLAG_REASONS } from '../../config';
import { errorCode, toSerbianError } from '../../services/errors';
import { createFlag } from '../../services/flags';
import { useApp } from '../../state/app-context';
import type { FlagReason } from '../../types';
import { Modal } from './Modal';
import { FieldError } from '../ui/FormErrors';
import { Spinner } from '../ui/EmptyState';

export function FlagDialog({ reportId }: { reportId: string }) {
  const { reports, closeModal, notify } = useApp();
  const report = reports.find((item) => item.id === reportId);
  // No reason is chosen in advance (GOV.UK: do not pre-select answers).
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (!reason) {
      setReasonError('Izaberi razlog.');
      document.getElementById('flag-reason-first')?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFlag(reportId, reason, note.trim());
      notify('success', 'Prijava sadržaja je poslata moderatorima.');
      closeModal();
    } catch (flagError) {
      // The rules refuse a second flag from the same account, so say exactly that.
      setError(
        errorCode(flagError) === 'permission-denied'
          ? 'Ova prijava je već prijavljena sa tvog naloga. Moderatori je pregledaju.'
          : toSerbianError(flagError, 'Prijava sadržaja nije poslata. Pokušaj ponovo.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Prijavi sadržaj"
      description="Moderatori pregledaju prijavu i mogu da uklone ili isprave sadržaj."
      size="sm"
      onClose={closeModal}
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn--quiet btn--sm" onClick={closeModal}>
            Otkaži
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void submit()}
            aria-disabled={busy || undefined}
          >
            {busy ? <Spinner size={14} /> : <Flag size={13} aria-hidden="true" />}
            {busy ? 'Slanje…' : 'Pošalji prijavu'}
          </button>
        </div>
      }
    >
      {report ? (
        <div className="flag-target">
          <span className="eyebrow">Prijava</span>
          <strong>{report.title}</strong>
        </div>
      ) : null}

      <fieldset
        className={`field field--fieldset${reasonError ? ' has-error' : ''}`}
        aria-describedby={reasonError ? 'flag-reason-error' : undefined}
      >
        <legend className="field__label">Razlog</legend>
        <div className="filter-sheet__rows">
          {FLAG_REASONS.map((option, index) => (
            <label
              key={option.id}
              className={`popover__row${reason === option.id ? ' is-active' : ''}`}
            >
              <input
                id={index === 0 ? 'flag-reason-first' : undefined}
                type="radio"
                name="flag-reason"
                value={option.id}
                checked={reason === option.id}
                onChange={() => {
                  setReason(option.id as FlagReason);
                  setReasonError(null);
                }}
                disabled={busy}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {reasonError ? <FieldError id="flag-reason-error">{reasonError}</FieldError> : null}
      </fieldset>

      <div className="field">
        <div className="field__top">
          <label htmlFor="flag-note">
            Napomena <span className="field__optional">opciono</span>
          </label>
          <span className="field__counter">{note.length}/500</span>
        </div>
        <textarea
          id="flag-note"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Kratko objasni šta nije u redu sa ovom prijavom."
          disabled={busy}
        />
      </div>

      {error ? (
        <div className="form-alert" role="alert">
          <TriangleAlert size={15} aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      <p className="field__hint">
        Jedna prijava po nalogu za isti sadržaj. Zloupotreba prijavljivanja može dovesti do
        ograničenja naloga.
      </p>
    </Modal>
  );
}
