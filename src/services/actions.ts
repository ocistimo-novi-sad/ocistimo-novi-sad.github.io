import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type { ActionStatus, CleanupAction, NewActionInput } from '../types';

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

export async function createActionRecord(input: NewActionInput): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  const payload: Record<string, unknown> = {
    ...actionPayload(input),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  };
  if (input.coverUrl) payload.coverUrl = input.coverUrl;

  await addDoc(collection(db, 'actions'), payload);
}

export async function updateActionRecord(
  actionId: string,
  input: NewActionInput,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  await updateDoc(doc(db, 'actions', actionId), {
    ...actionPayload(input),
    coverUrl: input.coverUrl || deleteField(),
  });
}

export async function updateActionStatus(
  actionId: string,
  status: ActionStatus,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  await updateDoc(doc(db, 'actions', actionId), { status });
}
