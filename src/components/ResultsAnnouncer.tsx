import { useEffect, useState } from 'react';
import { plural } from '../lib/format';
import { useApp } from '../state/app-context';

/**
 * One status region for the whole app: screen readers hear how many results a
 * search or filter leaves, when nothing matches, and when loading fails
 * (WCAG 4.1.3). It waits half a second, so typing is not read out letter by letter.
 */
export function ResultsAnnouncer() {
  const {
    layer,
    filters,
    reports,
    filteredReports,
    reportsPhase,
    reportsError,
    actionQuery,
    filteredActions,
    actionsPhase,
    actionsError,
  } = useApp();
  const [message, setMessage] = useState('');
  const filtering =
    filters.query.trim() !== '' ||
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.viewportOnly;

  let next = '';
  if (layer === 'reports') {
    if (reportsPhase === 'error') next = `Prijave nisu učitane. ${reportsError ?? ''}`.trim();
    else if (reportsPhase === 'ready' && filtering) {
      next =
        filteredReports.length === 0
          ? 'Nijedna prijava ne odgovara pretrazi i filterima.'
          : `${filteredReports.length} ${plural(filteredReports.length, 'prijava', 'prijave', 'prijava')} od ukupno ${reports.length}.`;
    }
  } else if (actionsPhase === 'error') {
    next = `Akcije nisu učitane. ${actionsError ?? ''}`.trim();
  } else if (actionsPhase === 'ready' && actionQuery.trim()) {
    next =
      filteredActions.length === 0
        ? 'Nijedna akcija ne odgovara pretrazi.'
        : `${filteredActions.length} ${plural(filteredActions.length, 'akcija', 'akcije', 'akcija')}.`;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setMessage(next), 500);
    return () => window.clearTimeout(timer);
  }, [next]);

  return (
    <p className="visually-hidden" role="status">
      {message}
    </p>
  );
}
