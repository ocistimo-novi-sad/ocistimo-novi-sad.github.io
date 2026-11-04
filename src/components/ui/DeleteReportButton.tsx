import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../state/app-context';
import type { Report } from '../../types';
import { Spinner } from './EmptyState';

/** Delete with an inline "are you sure" step, shared by every report surface. */
export function DeleteReportButton({
  report,
  onDeleted,
}: {
  report: Report;
  onDeleted?: () => void;
}) {
  const { deleteReport } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteReport(report);
      onDeleted?.();
    } catch {
      // The provider already surfaced the error.
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn--quiet btn--sm" onClick={() => setConfirming(true)}>
        <Trash2 size={12} aria-hidden="true" /> Obriši
      </button>
    );
  }

  return (
    <span className="delete-confirm" role="group" aria-label="Potvrda brisanja">
      <span className="delete-confirm__text">Trajno obrisati?</span>
      <button
        type="button"
        className="btn btn--danger btn--sm"
        onClick={() => void confirm()}
        disabled={busy}
      >
        {busy ? <Spinner size={12} /> : <Trash2 size={12} aria-hidden="true" />}
        Obriši
      </button>
      <button
        type="button"
        className="btn btn--quiet btn--sm"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Ne
      </button>
    </span>
  );
}
