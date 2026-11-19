import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type { ContentFlag, FlagReason } from '../types';

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function mapFlag(id: string, data: DocumentData): ContentFlag | null {
  const createdAt = asDate(data.createdAt);
  if (!createdAt || typeof data.reportId !== 'string') return null;
  return {
    id,
    reportId: data.reportId,
    reason: (data.reason as FlagReason) ?? 'other',
    note: typeof data.note === 'string' ? data.note : '',
    status: data.status === 'dismissed' || data.status === 'resolved' ? data.status : 'open',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt,
  };
}

export async function createFlag(
  reportId: string,
  reason: FlagReason,
  note: string,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Uloguj se da označiš sporan sadržaj.');
  }

  // Deterministic id: one flag per user per report, enforced by rules as well.
  const flagId = `${user.uid}__${reportId}`;

  await setDoc(doc(db, 'flags', flagId), {
    reportId,
    reason,
    note: note.slice(0, 500),
    status: 'open',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
}

function mapFlags(docs: { id: string; data: () => DocumentData }[]): ContentFlag[] {
  return docs
    .map((document) => mapFlag(document.id, document.data()))
    .filter((flag): flag is ContentFlag => flag !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Moderators: open flags, newest first. */
export async function fetchOpenFlags(): Promise<ContentFlag[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, 'flags'), where('status', '==', 'open'), limit(50)),
  );
  return mapFlags(snapshot.docs);
}

/** Moderators: open flags on one report, newest first. */
export async function fetchOpenFlagsForReport(reportId: string): Promise<ContentFlag[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(
      collection(db, 'flags'),
      where('reportId', '==', reportId),
      where('status', '==', 'open'),
    ),
  );
  return mapFlags(snapshot.docs);
}
