import type { DocumentData } from 'firebase-admin/firestore';

/** A change to a report that someone should hear about. */
export type ReportEvent =
  | { kind: 'submitted'; resubmitted: boolean }
  | { kind: 'edited' }
  | { kind: 'approved' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'proof-submitted' }
  | { kind: 'proof-approved'; byModerator: boolean }
  | { kind: 'proof-rejected'; reason: string };

export type ActionEvent = { kind: 'planned' | 'cancelled'; reportIds: string[] };

/** Events that go to moderators and admins; the rest go to the author. */
const STAFF_EVENTS: ReadonlySet<ReportEvent['kind']> = new Set([
  'submitted',
  'edited',
  'proof-submitted',
]);

export function isForStaff(event: ReportEvent): boolean {
  return STAFF_EVENTS.has(event.kind);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

/** Compares a report before and after a write. A deletion tells no one. */
export function reportEvents(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): ReportEvent[] {
  if (!after) return [];
  const events: ReportEvent[] = [];

  // Reports created before pre-moderation have no state and were public.
  const moderation = asString(after.moderation) || 'approved';
  const previous = before ? asString(before.moderation) || 'approved' : null;

  if (moderation === 'pending' && previous !== 'pending') {
    events.push({ kind: 'submitted', resubmitted: previous === 'rejected' });
  }
  if (previous && moderation === 'approved' && previous !== 'approved') {
    events.push({ kind: 'approved' });
  }
  if (previous && moderation === 'rejected' && previous !== 'rejected') {
    events.push({ kind: 'rejected', reason: asString(after.rejectionReason) });
  }
  if (after.editReview === 'pending' && before?.editReview !== 'pending') {
    events.push({ kind: 'edited' });
  }

  const resolution = after.resolution as DocumentData | undefined;
  const state = asString(resolution?.state);
  const previousState = asString((before?.resolution as DocumentData | undefined)?.state);
  if (state && state !== previousState) {
    if (state === 'pending') events.push({ kind: 'proof-submitted' });
    if (state === 'approved') {
      events.push({ kind: 'proof-approved', byModerator: resolution?.byModerator === true });
    }
    if (state === 'rejected') {
      events.push({ kind: 'proof-rejected', reason: asString(resolution?.rejectionReason) });
    }
  }

  return events;
}

/**
 * Compares an action before and after a write. Authors hear when their report
 * joins a planned action, and again if that action is cancelled.
 */
export function actionEvents(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): ActionEvent[] {
  if (!after) return [];
  const reportIds = stringList(after.reportIds);

  if (after.status === 'cancelled') {
    return before && before.status !== 'cancelled' && reportIds.length
      ? [{ kind: 'cancelled', reportIds }]
      : [];
  }
  if (after.status !== 'planned') return [];

  // A cancelled action that is planned again is news to every author.
  const known = before && before.status !== 'cancelled' ? stringList(before.reportIds) : [];
  const added = reportIds.filter((id) => !known.includes(id));
  return added.length ? [{ kind: 'planned', reportIds: added }] : [];
}
