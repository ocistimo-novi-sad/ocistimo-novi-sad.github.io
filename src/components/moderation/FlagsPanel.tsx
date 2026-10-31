import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { FLAG_REASONS } from '../../config';
import { formatRelativeTime } from '../../lib/format';
import { withTimeout } from '../../lib/timeout';
import { toSerbianError } from '../../services/errors';
import { fetchOpenFlags, resolveFlag } from '../../services/flags';
import { useApp } from '../../state/app-context';
import type { ContentFlag } from '../../types';
import { EmptyState, Spinner } from '../ui/EmptyState';

export function FlagsPanel() {
  const { reports, selectReport, closeModal, notify } = useApp();
  const [flags, setFlags] = useState<ContentFlag[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withTimeout(fetchOpenFlags());
      setFlags(result);
    } catch (loadError) {
      setError(toSerbianError(loadError, 'Prijave sadržaja nisu učitane.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (flag: ContentFlag, status: 'dismissed' | 'resolved') => {
    setBusyId(flag.id);
    try {
      await resolveFlag(flag.id, status);
      setFlags((current) => (current ?? []).filter((item) => item.id !== flag.id));
      notify(
        'success',
        status === 'resolved'
          ? 'Prijava sadržaja je rešena.'
          : 'Prijava sadržaja je odbijena.',
      );
    } catch (resolveError) {
      notify('error', toSerbianError(resolveError, 'Prijavu sadržaja nije moguće rešiti.'));
    } finally {
      setBusyId(null);
    }
  };

  const openReport = (flag: ContentFlag) => {
    const report = reports.find((item) => item.id === flag.reportId);
    if (!report) {
      notify('info', 'Ova prijava nije učitana na mapi. Osvežite prijave u panelu.');
      return;
    }
    selectReport(report);
    closeModal();
  };

  if (loading && !flags) {
    return (
      <div className="admin-loading" role="status">
        <Spinner size={16} />
        Učitavanje prijava sadržaja…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<TriangleAlert size={20} />}
        title="Prijave sadržaja nisu učitane"
        description={error}
        action={
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" /> Pokušaj ponovo
          </button>
        }
      />
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert size={20} />}
        title="Nema označenog sadržaja"
        description="Kada neko prijavi prijavu kao netačnu, uvredljivu ili duplu, pojaviće se ovde."
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
        <span className="eyebrow">Otvorene prijave sadržaja</span>
        <button type="button" className="link-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={12} aria-hidden="true" /> Osveži
        </button>
      </div>

      <ul className="flag-list">
        {flags.map((flag) => {
          const report = reports.find((item) => item.id === flag.reportId);
          const reason =
            FLAG_REASONS.find((option) => option.id === flag.reason)?.label ?? 'Prijava';
          return (
            <li key={flag.id} className="flag-row">
              <div className="flag-row__head">
                <span className="flag-row__reason">{reason}</span>
                <span className="flag-row__time">{formatRelativeTime(flag.createdAt)}</span>
              </div>
              <p className="flag-row__report">
                {report?.title ?? `Prijava ${flag.reportId.slice(0, 10)}…`}
              </p>
              {flag.note ? <p className="flag-row__note">„{flag.note}”</p> : null}
              <div className="flag-row__actions">
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => openReport(flag)}
                  disabled={!report}
                >
                  <ExternalLink size={12} aria-hidden="true" /> Otvori prijavu
                </button>
                <button
                  type="button"
                  className="btn btn--quiet btn--sm"
                  onClick={() => void resolve(flag, 'dismissed')}
                  disabled={busyId === flag.id}
                >
                  Odbij
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void resolve(flag, 'resolved')}
                  disabled={busyId === flag.id}
                >
                  {busyId === flag.id ? <Spinner size={12} /> : null}
                  Rešeno
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
