import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
    throw new AppError('unauthenticated', 'Prijavite se da biste prijavili sadržaj.');
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

export async function fetchOpenFlags(): Promise<ContentFlag[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, 'flags'), where('status', '==', 'open'), limit(50)),
  );

  return snapshot.docs
    .map((document) => mapFlag(document.id, document.data()))
    .filter((flag): flag is ContentFlag => flag !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function resolveFlag(
  flagId: string,
  status: 'dismissed' | 'resolved',
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  await updateDoc(doc(db, 'flags', flagId), {
    status,
    reviewedAt: serverTimestamp(),
    reviewedBy: user.uid,
  });
}
