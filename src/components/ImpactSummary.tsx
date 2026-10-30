import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { APP } from '../config';
import { plural } from '../lib/format';
import { useApp } from '../state/app-context';

/**
 * Welcome card at the top of the report list: a short invitation plus the
 * community's progress (reports, resolved share, upcoming cleanups).
 */
export function ImpactSummary() {
  const { reports, actions, reportsPhase, setView } = useApp();

  const { resolved, upcoming } = useMemo(() => {
    const now = Date.now();
    return {
      resolved: reports.filter((report) => report.status === 'resolved').length,
      upcoming: actions.filter(
        (action) =>
          (action.status === 'planned' || action.status === 'in_progress') &&
          action.date.getTime() >= now,
      ).length,
    };
  }, [reports, actions]);

  const total = reports.length;
  const share = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const loading = reportsPhase === 'loading' && total === 0;

  return (
    <section className="impact" aria-label="Napredak zajednice">
      <h2 className="impact__title">Zajedno čistimo {APP.city}.</h2>
      <p className="impact__sub">
        Prijavite problem u kraju ili se pridružite sledećoj akciji čišćenja.
      </p>

      {loading ? (
        <div className="impact__stats" aria-hidden="true">
          <span className="skeleton skeleton--stat" />
          <span className="skeleton skeleton--stat" />
          <span className="skeleton skeleton--stat" />
        </div>
      ) : (
        <>
          <div className="impact__stats">
            <div className="impact-stat">
              <span className="impact-stat__value">{total}</span>
              <span className="impact-stat__label">
                {plural(total, 'prijava', 'prijave', 'prijava')}
              </span>
            </div>
            <div className="impact-stat impact-stat--resolved">
              <span className="impact-stat__value">{resolved}</span>
              <span className="impact-stat__label">rešeno</span>
            </div>
            <button
              type="button"
              className="impact-stat"
              onClick={() => setView('actions')}
              title="Pogledajte predstojeće akcije"
            >
              <span className="impact-stat__value">{upcoming}</span>
              <span className="impact-stat__link">
                {plural(upcoming, 'akcija', 'akcije', 'akcija')}
                <ArrowRight size={11} aria-hidden="true" />
              </span>
            </button>
          </div>

          {total > 0 ? (
            <div className="impact__progress">
              <div className="impact__progress-row">
                <span>Rešeno od svih prijava</span>
                <strong>{share}%</strong>
              </div>
              <div
                className="impact__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={share}
                aria-label="Udeo rešenih prijava"
              >
                <span style={{ width: `${share}%` }} />
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
