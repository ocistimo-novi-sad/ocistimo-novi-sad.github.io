import { useMemo, useState, type ReactNode } from 'react';
import { Check, EyeOff } from 'lucide-react';
import { FLAG_REASONS, REMOVE_REASON_BY_FLAG, REMOVE_REASONS } from '../../config';
import { formatRelativeTime, plural } from '../../lib/format';
import { useApp } from '../../state/app-context';
import type { ContentFlag, FlagReason } from '../../types';
import { Spinner } from '../ui/EmptyState';
import { RejectForm } from './RejectForm';

export function formatFlagCount(count: number): string {
  return `${count} ${plural(count, 'oznaka', 'oznake', 'oznaka')}`;
}

/** Offered removal reasons, the ones matching the most common flag reason first. */
function removeReasons(flags: ContentFlag[]): string[] {
  const counts = new Map<FlagReason, number>();
  for (const flag of flags) counts.set(flag.reason, (counts.get(flag.reason) ?? 0) + 1);
  const matched = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => (reason === 'other' ? undefined : REMOVE_REASON_BY_FLAG[reason]))
    .filter((reason): reason is string => Boolean(reason));
  return [...matched, ...REMOVE_REASONS.filter((reason) => !matched.includes(reason))];
}

/**
 * The open flags on one report and the moderator's decision on them: keep the
 * report, or take it off the map with a reason. Either closes every flag.
 */
export function FlagDecision({
  reportId,
  flags,
  extraAction,
  onDone,
}: {
  reportId: string;
  flags: ContentFlag[];
  /** Shown before the decision buttons, e.g. "Otvori prijavu". */
  extraAction?: ReactNode;
  onDone: () => void;
}) {
  const { keepFlaggedReport, removeFlaggedReport } = useApp();
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const presets = useMemo(() => removeReasons(flags), [flags]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      setRemoving(false);
      onDone();
    } catch {
      // The provider already surfaced the error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ul className="flag-items">
        {flags.map((flag) => (
          <li key={flag.id} className="flag-item">
            <div className="flag-row__head">
              <span className="flag-row__reason">
                {FLAG_REASONS.find((option) => option.id === flag.reason)?.label ?? 'Drugo'}
              </span>
              <span className="flag-row__time">{formatRelativeTime(flag.createdAt)}</span>
            </div>
            {flag.note ? <p className="flag-row__note">„{flag.note}”</p> : null}
          </li>
        ))}
      </ul>

      {removing ? (
        <RejectForm
          heading="Ukloni prijavu sa mape"
          hint="Prijava više neće biti javna. Autor vidi razlog i može da je ispravi i ponovo pošalje."
          label="Razlog uklanjanja"
          placeholder="Zašto prijava ne može da ostane na mapi?"
          submitLabel="Ukloni sa mape"
          presets={presets}
          busy={busy}
          onCancel={() => setRemoving(false)}
          onSubmit={(reason) => void run(() => removeFlaggedReport(reportId, reason))}
        />
      ) : (
        <div className="flag-row__actions">
          {extraAction}
          <button
            type="button"
            className="btn btn--quiet btn--sm"
            onClick={() => void run(() => keepFlaggedReport(flags.map((flag) => flag.id)))}
            disabled={busy}
          >
            {busy ? <Spinner size={12} /> : <Check size={12} aria-hidden="true" />}
            Prijava je u redu
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => setRemoving(true)}
            disabled={busy}
          >
            <EyeOff size={12} aria-hidden="true" />
            Ukloni sa mape…
          </button>
        </div>
      )}
    </>
  );
}
