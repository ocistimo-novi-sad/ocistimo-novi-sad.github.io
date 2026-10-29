import { useState } from 'react';
import { Flag, TriangleAlert } from 'lucide-react';
import { FLAG_REASONS } from '../../config';
import { toSerbianError } from '../../services/errors';
import { createFlag } from '../../services/flags';
import { useApp } from '../../state/app-context';
import type { FlagReason } from '../../types';
import { Modal } from './Modal';
import { Spinner } from '../ui/EmptyState';

export function FlagDialog({ reportId }: { reportId: string }) {
  const { reports, closeModal, notify } = useApp();
  const report = reports.find((item) => item.id === reportId);
  const [reason, setReason] = useState<FlagReason>('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createFlag(reportId, reason, note.trim());
      notify('success', 'Prijava sadržaja je poslata administratorima.');
      closeModal();
    } catch (flagError) {
      setError(
        toSerbianError(
          flagError,
          'Prijava sadržaja nije poslata. Možda ste već prijavili ovu prijavu.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Prijavi sadržaj"
      description="Administratori pregledaju prijavu i mogu da uklone ili isprave sadržaj."
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
            disabled={busy}
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

      <div className="field">
        <label htmlFor="flag-reason">Razlog</label>
        <select
          id="flag-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value as FlagReason)}
          disabled={busy}
        >
          {FLAG_REASONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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
          placeholder="Kratko objasnite šta nije u redu sa ovom prijavom."
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
