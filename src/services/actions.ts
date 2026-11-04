import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
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

/**
 * Reports that must receive a status: existing documents whose status differs.
 * Skipping unchanged ones keeps unrelated action edits from rewriting reports.
 */
async function reportRefsToUpdate(
  db: Firestore,
  reportIds: string[],
  status: ReportStatus,
) {
  const unique = [...new Set(reportIds)];
  const snapshots = await Promise.all(unique.map((id) => getDoc(doc(db, 'reports', id))));
  return snapshots
    .filter((snapshot) => snapshot.exists() && snapshot.data()?.status !== status)
    .map((snapshot) => snapshot.ref);
}

/**
 * Stages the status change for every report linked to an action, so the action
 * and its reports are committed together by the caller's batch.
 */
async function stageReportStatusUpdates(
  db: Firestore,
  batch: WriteBatch,
  reportIds: string[],
  actionStatus: ActionStatus,
  user: ActionUser,
): Promise<void> {
  const status = ACTION_REPORT_STATUS[actionStatus];
  if (!status || reportIds.length === 0) return;

  const refs = await reportRefsToUpdate(db, reportIds, status);
  const moderatedBy = user.uid;
  const moderatedByName = (user.displayName ?? 'Administrator').slice(0, 80);

  for (const ref of refs) {
    batch.update(ref, {
      status,
      moderatedAt: serverTimestamp(),
      moderatedBy,
      moderatedByName,
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
  await stageReportStatusUpdates(db, batch, input.reportIds, input.status, user);
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

  const batch = writeBatch(db);
  batch.update(doc(db, 'actions', actionId), {
    ...actionPayload(input),
    coverUrl: input.coverUrl || deleteField(),
    updatedBy: user.uid,
  });
  await stageReportStatusUpdates(db, batch, input.reportIds, input.status, user);
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
  const batch = writeBatch(db);
  batch.update(actionRef, { status, updatedBy: user.uid });

  // Cancelling has no matching report status, so reports stay as they are.
  if (ACTION_REPORT_STATUS[status]) {
    const snapshot = await getDoc(actionRef);
    const reportIds = asStringList(snapshot.data()?.reportIds);
    await stageReportStatusUpdates(db, batch, reportIds, status, user);
  }

  await batch.commit();
}

/** Removes the action for good. Linked reports stay as they are. */
export async function deleteActionRecord(actionId: string): Promise<void> {
  const db = requireDb();
  if (!requireAuth().currentUser) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  await deleteDoc(doc(db, 'actions', actionId));
}
