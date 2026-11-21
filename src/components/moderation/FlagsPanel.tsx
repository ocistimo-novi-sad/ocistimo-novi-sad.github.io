import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { fetchOpenFlags } from '../../services/flags';
import { useApp } from '../../state/app-context';
import type { ContentFlag } from '../../types';
import { EmptyState, Spinner } from '../ui/EmptyState';
import { FlagDecision, formatFlagCount } from './FlagDecision';

/** Open flags grouped by report, the most recently flagged report first. */
function groupByReport(flags: ContentFlag[]): { reportId: string; flags: ContentFlag[] }[] {
  const groups = new Map<string, ContentFlag[]>();
  for (const flag of flags) {
    groups.set(flag.reportId, [...(groups.get(flag.reportId) ?? []), flag]);
  }
  return [...groups].map(([reportId, items]) => ({ reportId, flags: items }));
}

export function FlagsPanel() {
  const { reports, selectReport, closeModal, notify } = useApp();
  const [flags, setFlags] = useState<ContentFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const groups = useMemo(() => groupByReport(flags ?? []), [flags]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withTimeout(fetchOpenFlags());
      setFlags(result);
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Sporan sadržaj nije učitan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeGroup = (reportId: string) => {
    setFlags((current) => (current ?? []).filter((item) => item.reportId !== reportId));
  };

  const openReport = (reportId: string) => {
    const report = reports.find((item) => item.id === reportId);
    if (!report) {
      notify('info', 'Ova prijava nije učitana na mapi. Osveži prijave u panelu.');
      return;
    }
    selectReport(report);
    closeModal();
  };

  if (loading && !flags) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje spornog sadržaja…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Sporan sadržaj nije učitan"
        description={error}
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert size={20} />}
        title="Nema spornog sadržaja"
        description="Kada neko označi prijavu kao netačnu, uvredljivu ili duplu, pojaviće se ovde."
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Osveži
          </button>
        }
      />
    );
  }

  return (
    <div className="flags">
      <div className="flags__head">
        <span className="eyebrow">Sporne prijave</span>
        <button type="button" className="link-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={12} aria-hidden="true" /> Osveži
        </button>
      </div>

      <ul className="flag-list">
        {groups.map((group) => {
          const report = reports.find((item) => item.id === group.reportId);
          return (
            <li key={group.reportId} className="flag-row">
              <div className="flag-row__head">
                <p className="flag-row__report">
                  {report?.title ?? `Prijava ${group.reportId.slice(0, 10)}…`}
                </p>
                <span className="flag-row__count">{formatFlagCount(group.flags.length)}</span>
              </div>
              <FlagDecision
                reportId={group.reportId}
                flags={group.flags}
                onDone={() => closeGroup(group.reportId)}
                extraAction={
                  <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    onClick={() => openReport(group.reportId)}
                    disabled={!report}
                  >
                    <ExternalLink size={12} aria-hidden="true" /> Otvori prijavu
                  </button>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
