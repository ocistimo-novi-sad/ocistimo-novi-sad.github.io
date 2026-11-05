import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';
import { ACTION_REPORT_STATUS } from '../config';
import { requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type { ActionStatus, CleanupAction, NewActionInput, ReportStatus } from '../types';

const STATUS_VALUES: ActionStatus[] = [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
];

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item: unknown): item is string => typeof item === 'string')
    : [];
}

export function mapAction(id: string, data: DocumentData): CleanupAction | null {
  const date = asDate(data.date);
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (!date || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const status = STATUS_VALUES.includes(data.status as ActionStatus)
    ? (data.status as ActionStatus)
    : 'planned';

  return {
    id,
    title: asString(data.title) || 'Akcija bez naziva',
    description: asString(data.description),
    date,
    meetingPoint: asString(data.meetingPoint),
    latitude,
    longitude,
    status,
    reportIds: asStringList(data.reportIds),
    supplies: asStringList(data.supplies),
    organizerName: asString(data.organizerName),
    organizerNote: asString(data.organizerNote),
    coverUrl: asString(data.coverUrl) || undefined,
    resultImageUrls: asStringList(data.resultImageUrls),
    createdAt: asDate(data.createdAt) ?? new Date(),
    createdBy: asString(data.createdBy),
    source: 'firestore',
  };
}

export async function fetchActions(): Promise<CleanupAction[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, 'actions'), orderBy('date', 'desc'), limit(80)),
  );

  return snapshot.docs
    .map((document) => mapAction(document.id, document.data()))
    .filter((action): action is CleanupAction => action !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function actionPayload(input: NewActionInput): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description,
    date: Timestamp.fromDate(input.date),
    meetingPoint: input.meetingPoint,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status,
    reportIds: input.reportIds,
    supplies: input.supplies,
    organizerName: input.organizerName,
    organizerNote: input.organizerNote,
    resultImageUrls: input.resultImageUrls,
  };
}

interface ActionUser {
  uid: string;
  displayName: string | null;
}

/** Report statuses an action gives while it is still ahead or under way. */
const ACTIVE_REPORT_STATUSES: ReportStatus[] = ['planned', 'in_progress'];

function moderationStamp(user: ActionUser) {
  return {
    moderatedAt: serverTimestamp(),
    moderatedBy: user.uid,
    moderatedByName: (user.displayName ?? 'Administrator').slice(0, 80),
  };
}

function reportSnapshots(db: Firestore, reportIds: string[]) {
  const unique = [...new Set(reportIds)];
  return Promise.all(unique.map((id) => getDoc(doc(db, 'reports', id))));
}

/**
 * Stages the status an action gives its linked reports, so the action and its
 * reports are committed together by the caller's batch. statusActionId records
 * which action set the status, so cancelling or deleting that action later
 * undoes only its own changes. Reports that already have the status are left
 * alone, which keeps unrelated action edits from rewriting them.
 */
async function stageReportStatusUpdates(
  db: Firestore,
  batch: WriteBatch,
  actionId: string,
  reportIds: string[],
  actionStatus: ActionStatus,
  user: ActionUser,
): Promise<void> {
  const status = ACTION_REPORT_STATUS[actionStatus];
  if (!status || reportIds.length === 0) return;

  for (const snapshot of await reportSnapshots(db, reportIds)) {
    if (!snapshot.exists() || snapshot.data().status === status) continue;
    batch.update(snapshot.ref, { status, statusActionId: actionId, ...moderationStamp(user) });
  }
}

/** The nearest planned or ongoing action, other than `exceptId`, that links the report. */
async function otherActiveAction(
  db: Firestore,
  reportId: string,
  exceptId: string,
): Promise<CleanupAction | null> {
  const snapshot = await getDocs(
    query(collection(db, 'actions'), where('reportIds', 'array-contains', reportId)),
  );
  const active = snapshot.docs
    .filter((document) => document.id !== exceptId)
    .map((document) => mapAction(document.id, document.data()))
    .filter(
      (action): action is CleanupAction =>
        action !== null && (action.status === 'planned' || action.status === 'in_progress'),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return active[0] ?? null;
}

/**
 * Stages the undo for reports an action no longer covers: it was cancelled or
 * deleted, or the report was taken out of it. Only a planned or ongoing status
 * that came from this action changes. The report moves to the nearest other
 * active action that links it, or back to "new". A status a moderator set by
 * hand is kept. Back on "new", statusActionId still names this action, so the
 * mail function knows an action made the change.
 */
async function stageReportRelease(
  db: Firestore,
  batch: WriteBatch,
  actionId: string,
  reportIds: string[],
  user: ActionUser,
): Promise<void> {
  if (reportIds.length === 0) return;

  for (const snapshot of await reportSnapshots(db, reportIds)) {
    const data = snapshot.data();
    if (
      !data ||
      data.statusActionId !== actionId ||
      !ACTIVE_REPORT_STATUSES.includes(data.status as ReportStatus)
    ) {
      continue;
    }

    const next = await otherActiveAction(db, snapshot.id, actionId);
    batch.update(snapshot.ref, {
      status: (next && ACTION_REPORT_STATUS[next.status]) ?? 'new',
      statusActionId: next?.id ?? actionId,
      ...moderationStamp(user),
    });
  }
}

export async function createActionRecord(input: NewActionInput): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavi se kao administrator.');
  }

  const actionRef = doc(collection(db, 'actions'));
  const payload: Record<string, unknown> = {
    ...actionPayload(input),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    updatedBy: user.uid,
  };
  if (input.coverUrl) payload.coverUrl = input.coverUrl;

  const batch = writeBatch(db);
  batch.set(actionRef, payload);
  await stageReportStatusUpdates(db, batch, actionRef.id, input.reportIds, input.status, user);
  await batch.commit();
}

export async function updateActionRecord(
  actionId: string,
  input: NewActionInput,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavi se kao administrator.');
  }

  const actionRef = doc(db, 'actions', actionId);
  const previous = await getDoc(actionRef);
  const removed = asStringList(previous.data()?.reportIds).filter(
    (id) => !input.reportIds.includes(id),
  );

  const batch = writeBatch(db);
  batch.update(actionRef, {
    ...actionPayload(input),
    coverUrl: input.coverUrl || deleteField(),
    updatedBy: user.uid,
  });
  if (input.status === 'cancelled') {
    await stageReportRelease(db, batch, actionId, [...input.reportIds, ...removed], user);
  } else {
    await stageReportStatusUpdates(db, batch, actionId, input.reportIds, input.status, user);
    await stageReportRelease(db, batch, actionId, removed, user);
  }
  await batch.commit();
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavi se kao administrator.');
  }

  const actionRef = doc(db, 'actions', actionId);
  const snapshot = await getDoc(actionRef);
  const reportIds = asStringList(snapshot.data()?.reportIds);

  const batch = writeBatch(db);
  batch.update(actionRef, { status, updatedBy: user.uid });
  if (status === 'cancelled') {
    await stageReportRelease(db, batch, actionId, reportIds, user);
  } else {
    await stageReportStatusUpdates(db, batch, actionId, reportIds, status, user);
  }
  await batch.commit();
}

/** Removes the action for good. Its reports are released as on cancelling. */
export async function deleteActionRecord(actionId: string): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavi se kao moderator ili administrator.');
  }

  const actionRef = doc(db, 'actions', actionId);
  const snapshot = await getDoc(actionRef);

  const batch = writeBatch(db);
  batch.delete(actionRef);
  await stageReportRelease(db, batch, actionId, asStringList(snapshot.data()?.reportIds), user);
  await batch.commit();
}
