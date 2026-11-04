import type { CleanupAction, Report } from '../types';

/** How long after its start an action still counts as upcoming. */
const STILL_UPCOMING_MS = 4 * 3_600_000;

/**
 * A planned or running action that started less than four hours ago. One rule
 * for the list, the map and every count, so they always agree.
 */
export function isUpcomingAction(action: CleanupAction, now = Date.now()): boolean {
  return (
    (action.status === 'planned' || action.status === 'in_progress') &&
    action.date.getTime() >= now - STILL_UPCOMING_MS
  );
}

/** A report people can still do something about: not fixed and not unsuitable. */
export function isOpenReport(report: Report): boolean {
  return report.status !== 'resolved' && report.status !== 'not_suitable';
}
