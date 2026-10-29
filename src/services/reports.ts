import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type { Category, NewReportInput, Report, ReportStatus } from '../types';

const CATEGORY_VALUES: Category[] = [
  'waste',
  'graffiti',
  'damaged_infrastructure',
  'neglected_area',
  'other',
];

const STATUS_VALUES: ReportStatus[] = [
  'new',
  'verified',
  'planned',
  'in_progress',
  'resolved',
  'not_suitable',
];

export interface ReportsPage {
  reports: Report[];
  cursor: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function mapReport(id: string, data: DocumentData): Report | null {
  const createdAt = asDate(data.createdAt);
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);

  if (
    !createdAt ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const category = CATEGORY_VALUES.includes(data.category as Category)
    ? (data.category as Category)
    : 'other';
  const status = STATUS_VALUES.includes(data.status as ReportStatus)
    ? (data.status as ReportStatus)
    : 'new';

  return {
    id,
    title: asString(data.title) || 'Bez naslova',
    description: asString(data.description),
    category,
    status,
    latitude,
    longitude,
    createdAt,
    createdBy: asString(data.createdBy),
    createdByName: asString(data.createdByName) || undefined,
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((url: unknown): url is string => typeof url === 'string')
      : [],
    address: asString(data.address) || undefined,
    moderatedAt: asDate(data.moderatedAt),
    source: 'firestore',
  };
}

export async function fetchReportsPage(
  pageSize: number,
  cursor: QueryDocumentSnapshot | null = null,
): Promise<ReportsPage> {
  const db = requireDb();
  const base = collection(db, 'reports');
  const pageQuery = cursor
    ? query(base, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
    : query(base, orderBy('createdAt', 'desc'), limit(pageSize));

  const snapshot = await getDocs(pageQuery);
  const reports = snapshot.docs
    .map((document) => mapReport(document.id, document.data()))
    .filter((report): report is Report => report !== null);

  return {
    reports,
    cursor: snapshot.docs.at(-1) ?? null,
    hasMore: snapshot.size === pageSize,
  };
}

export async function createReportRecord(
  input: NewReportInput,
  imageUrls: string[],
): Promise<Report> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se da biste poslali prijavu.');
  }

  const payload: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'new',
    latitude: input.latitude,
    longitude: input.longitude,
    imageUrls,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  };

  if (input.address) payload.address = input.address;
  if (input.createdByName) payload.createdByName = input.createdByName;

  const reference = await addDoc(collection(db, 'reports'), payload);

  return {
    id: reference.id,
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'new',
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address,
    createdByName: input.createdByName,
    createdAt: new Date(),
    createdBy: user.uid,
    imageUrls,
    source: 'firestore',
  };
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
): Promise<void> {
  const db = requireDb();
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se da biste menjali status.');
  }

  await updateDoc(doc(db, 'reports', reportId), {
    status,
    moderatedAt: serverTimestamp(),
    moderatedBy: user.uid,
  });
}
