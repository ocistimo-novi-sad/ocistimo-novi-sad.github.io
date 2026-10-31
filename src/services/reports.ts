import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type {
  Category,
  ModerationState,
  NewReportInput,
  Report,
  ReportContent,
  ReportStatus,
  Resolution,
} from '../types';

/** Fields an author writes, in the order an edit is reviewed. */
export const CONTENT_KEYS = [
  'title',
  'category',
  'description',
  'communityCan',
  'helpNeeded',
  'address',
  'latitude',
  'longitude',
  'imageUrls',
] as const satisfies readonly (keyof ReportContent)[];

const CATEGORY_VALUES: Category[] = [
  'unwanted_graffiti',
  'fan_graffiti',
  'stickers_posters',
  'illegal_dump',
  'damaged_infrastructure',
  'other',
];

/** Category ids used before the category list was revised. */
const LEGACY_CATEGORIES: Record<string, Category> = {
  graffiti: 'unwanted_graffiti',
  waste: 'illegal_dump',
  neglected_area: 'other',
};

const MODERATION_VALUES: ModerationState[] = ['pending', 'approved', 'rejected'];

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

function mapContent(data: DocumentData): ReportContent | null {
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const category = CATEGORY_VALUES.includes(data.category as Category)
    ? (data.category as Category)
    : (LEGACY_CATEGORIES[data.category as string] ?? 'other');

  return {
    title: asString(data.title) || 'Bez naslova',
    description: asString(data.description),
    category,
    latitude,
    longitude,
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((url: unknown): url is string => typeof url === 'string')
      : [],
    address: asString(data.address) || undefined,
    communityCan: asString(data.communityCan) || undefined,
    helpNeeded: asString(data.helpNeeded) || undefined,
  };
}

function mapResolution(value: unknown): Resolution | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as DocumentData;
  if (data.state !== 'pending' && data.state !== 'approved' && data.state !== 'rejected') {
    return undefined;
  }
  return {
    state: data.state,
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls.filter((url: unknown): url is string => typeof url === 'string')
      : [],
    note: asString(data.note),
    submittedAt: asDate(data.submittedAt),
    submittedBy: asString(data.submittedBy) || undefined,
    reviewedAt: asDate(data.reviewedAt),
    reviewedBy: asString(data.reviewedBy) || undefined,
    rejectionReason: asString(data.rejectionReason) || undefined,
    byModerator: data.byModerator === true,
  };
}

export function mapReport(id: string, data: DocumentData): Report | null {
  const createdAt = asDate(data.createdAt);
  const content = mapContent(data);
  if (!createdAt || !content) return null;

  const status = STATUS_VALUES.includes(data.status as ReportStatus)
    ? (data.status as ReportStatus)
    : 'new';
  // Reports created before pre-moderation have no state and were public.
  const moderation = MODERATION_VALUES.includes(data.moderation as ModerationState)
    ? (data.moderation as ModerationState)
    : 'approved';

  const previous =
    data.previousVersion && typeof data.previousVersion === 'object'
      ? mapContent(data.previousVersion as DocumentData)
      : null;

  return {
    id,
    ...content,
    status,
    createdAt,
    createdBy: asString(data.createdBy),
    createdByName: asString(data.createdByName) || undefined,
    editedAt: asDate(data.editedAt),
    editReview: data.editReview === 'pending' ? 'pending' : undefined,
    previousVersion: previous ?? undefined,
    resolution: mapResolution(data.resolution),
    moderation,
    rejectionReason: asString(data.rejectionReason) || undefined,
    moderatedBy: asString(data.moderatedBy) || undefined,
    moderatedByName: asString(data.moderatedByName) || undefined,
    moderatedAt: asDate(data.moderatedAt),
    source: 'firestore',
  };
}

function mapSnapshots(docs: QueryDocumentSnapshot[]): Report[] {
  return docs
    .map((document) => mapReport(document.id, document.data()))
    .filter((report): report is Report => report !== null);
}

function currentUser() {
  const user = requireAuth().currentUser;
  if (!user) {
    throw new AppError('unauthenticated', 'Prijavite se ponovo.');
  }
  return user;
}

export async function fetchReportsPage(
  pageSize: number,
  cursor: QueryDocumentSnapshot | null = null,
): Promise<ReportsPage> {
  const db = requireDb();
  // Security Rules are not filters: the public query must ask for approved
  // reports only, or it is rejected as a whole.
  const base = query(collection(db, 'reports'), where('moderation', '==', 'approved'));
  const pageQuery = cursor
    ? query(base, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
    : query(base, orderBy('createdAt', 'desc'), limit(pageSize));

  const snapshot = await getDocs(pageQuery);
  const reports = mapSnapshots(snapshot.docs);

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
    communityCan: input.communityCan,
    helpNeeded: input.helpNeeded,
    category: input.category,
    status: 'new',
    moderation: 'pending',
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
    communityCan: input.communityCan,
    helpNeeded: input.helpNeeded,
    category: input.category,
    status: 'new',
    moderation: 'pending',
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
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    status,
    ...moderationStamp(user),
  });
}

/** A single report, for deep links. Rules decide whether the viewer may see it. */
export async function fetchReport(reportId: string): Promise<Report | null> {
  const snapshot = await getDoc(doc(requireDb(), 'reports', reportId));
  return snapshot.exists() ? mapReport(snapshot.id, snapshot.data()) : null;
}

/** Every report of the signed-in author, including unpublished ones. */
export async function fetchMyReports(uid: string): Promise<Report[]> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(), 'reports'),
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  );
  return mapSnapshots(snapshot.docs);
}

const QUEUE_LIMIT = 50;

function pendingQuery() {
  return query(collection(requireDb(), 'reports'), where('moderation', '==', 'pending'));
}

/** Moderators: reports waiting for review, oldest first. */
export async function fetchPendingReports(): Promise<Report[]> {
  const snapshot = await getDocs(
    query(pendingQuery(), orderBy('createdAt', 'asc'), limit(QUEUE_LIMIT)),
  );
  return mapSnapshots(snapshot.docs);
}

export async function countPendingReports(): Promise<number> {
  const snapshot = await getCountFromServer(pendingQuery());
  return snapshot.data().count;
}

function moderationStamp(user: { uid: string; displayName: string | null }) {
  return {
    moderatedAt: serverTimestamp(),
    moderatedBy: user.uid,
    moderatedByName: (user.displayName ?? 'Moderator').slice(0, 80),
  };
}

export async function approveReport(reportId: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    moderation: 'approved',
    rejectionReason: deleteField(),
    ...moderationStamp(user),
  });
}

export async function rejectReport(reportId: string, reason: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    moderation: 'rejected',
    rejectionReason: reason,
    ...moderationStamp(user),
  });
}

/** Writes edited content; optional fields left empty are removed. */
function contentWrite(content: ReportContent): Record<string, unknown> {
  return {
    title: content.title,
    description: content.description,
    category: content.category,
    latitude: content.latitude,
    longitude: content.longitude,
    imageUrls: content.imageUrls,
    address: content.address || deleteField(),
    communityCan: content.communityCan || deleteField(),
    helpNeeded: content.helpNeeded || deleteField(),
  };
}

/** The stored content fields exactly as they are, for previousVersion. */
function pickStoredContent(data: DocumentData): Record<string, unknown> {
  return Object.fromEntries(
    CONTENT_KEYS.filter((key) => key in data).map((key) => [key, data[key]]),
  );
}

/**
 * Author edit. Before publication it goes back to the review queue. After
 * publication it stays live and waits for a moderator's look, keeping the
 * last approved version so a moderator can restore it.
 */
export async function updateOwnReport(
  report: Report,
  content: ReportContent,
): Promise<Partial<Report>> {
  const reference = doc(requireDb(), 'reports', report.id);

  if (report.moderation !== 'approved') {
    await updateDoc(reference, {
      ...contentWrite(content),
      moderation: 'pending',
      rejectionReason: deleteField(),
      editedAt: serverTimestamp(),
    });
    return { ...content, moderation: 'pending', rejectionReason: undefined, editedAt: new Date() };
  }

  const changes: Record<string, unknown> = {
    ...contentWrite(content),
    editedAt: serverTimestamp(),
    editReview: 'pending',
  };
  let previousVersion = report.previousVersion;

  // Rules require previousVersion to match the stored content exactly, so it
  // is taken from the server rather than from the (normalised) local copy.
  if (report.editReview !== 'pending') {
    const snapshot = await getDoc(reference);
    const data = snapshot.data();
    if (!data) throw new AppError('not-found', 'Prijava više ne postoji.');
    const stored = pickStoredContent(data);
    changes.previousVersion = stored;
    previousVersion = mapContent(stored) ?? undefined;
  }

  await updateDoc(reference, changes);
  return { ...content, editedAt: new Date(), editReview: 'pending', previousVersion };
}

/** Moderator edit: applied directly and attributed, no further review. */
export async function updateReportAsModerator(
  reportId: string,
  content: ReportContent,
): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    ...contentWrite(content),
    ...moderationStamp(user),
  });
}

/**
 * Deletes a report. A moderator also closes the open content flags that point
 * at it, in the same batch, so the flags queue does not keep orphans.
 */
export async function deleteReportRecord(reportId: string, asModerator: boolean): Promise<void> {
  const db = requireDb();
  const reference = doc(db, 'reports', reportId);
  if (!asModerator) {
    await deleteDoc(reference);
    return;
  }

  const user = currentUser();
  const flags = await getDocs(
    query(
      collection(db, 'flags'),
      where('reportId', '==', reportId),
      where('status', '==', 'open'),
    ),
  );
  const batch = writeBatch(db);
  batch.delete(reference);
  for (const flag of flags.docs) {
    batch.update(flag.ref, {
      status: 'resolved',
      reviewedAt: serverTimestamp(),
      reviewedBy: user.uid,
    });
  }
  await batch.commit();
}

function editsQuery() {
  return query(collection(requireDb(), 'reports'), where('editReview', '==', 'pending'));
}

/** Moderators: published reports whose author edits wait for a look. */
export async function fetchEditedReports(): Promise<Report[]> {
  const snapshot = await getDocs(query(editsQuery(), orderBy('editedAt', 'asc'), limit(QUEUE_LIMIT)));
  return mapSnapshots(snapshot.docs);
}

export async function countEditedReports(): Promise<number> {
  const snapshot = await getCountFromServer(editsQuery());
  return snapshot.data().count;
}

export async function acceptEdit(reportId: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    editReview: deleteField(),
    previousVersion: deleteField(),
    ...moderationStamp(user),
  });
}

/** Restores the last approved content and closes the edit review. */
export async function revertEdit(reportId: string): Promise<ReportContent> {
  const user = currentUser();
  const reference = doc(requireDb(), 'reports', reportId);
  const snapshot = await getDoc(reference);
  const stored = snapshot.data()?.previousVersion as DocumentData | undefined;
  const restored = stored ? mapContent(stored) : null;
  if (!stored || !restored) {
    throw new AppError('not-found', 'Prethodna verzija nije sačuvana.');
  }

  const changes: Record<string, unknown> = {
    editReview: deleteField(),
    previousVersion: deleteField(),
    editedAt: deleteField(),
    ...moderationStamp(user),
  };
  for (const key of CONTENT_KEYS) {
    changes[key] = key in stored ? stored[key] : deleteField();
  }
  await updateDoc(reference, changes);
  return restored;
}

/** Author: proof that the problem was fixed, waiting for a moderator. */
export async function submitResolution(
  reportId: string,
  imageUrls: string[],
  note: string,
): Promise<Resolution> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    resolution: {
      state: 'pending',
      imageUrls,
      note,
      submittedAt: serverTimestamp(),
      submittedBy: user.uid,
    },
  });
  return {
    state: 'pending',
    imageUrls,
    note,
    submittedAt: new Date(),
    submittedBy: user.uid,
    reviewedAt: null,
  };
}

function resolutionsQuery() {
  return query(collection(requireDb(), 'reports'), where('resolution.state', '==', 'pending'));
}

/** Moderators: proofs of a fix waiting for confirmation, oldest first. */
export async function fetchPendingResolutions(): Promise<Report[]> {
  const snapshot = await getDocs(
    query(resolutionsQuery(), orderBy('resolution.submittedAt', 'asc'), limit(QUEUE_LIMIT)),
  );
  return mapSnapshots(snapshot.docs);
}

export async function countPendingResolutions(): Promise<number> {
  const snapshot = await getCountFromServer(resolutionsQuery());
  return snapshot.data().count;
}

/** Confirms the author's proof: the report becomes resolved. */
export async function approveResolution(reportId: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    status: 'resolved',
    'resolution.state': 'approved',
    'resolution.rejectionReason': deleteField(),
    'resolution.reviewedAt': serverTimestamp(),
    'resolution.reviewedBy': user.uid,
    ...moderationStamp(user),
  });
}

export async function rejectResolution(reportId: string, reason: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    'resolution.state': 'rejected',
    'resolution.rejectionReason': reason,
    'resolution.reviewedAt': serverTimestamp(),
    'resolution.reviewedBy': user.uid,
    ...moderationStamp(user),
  });
}

/** Moderator marks a report resolved without the author's proof. */
export async function markResolved(reportId: string): Promise<void> {
  const user = currentUser();
  await updateDoc(doc(requireDb(), 'reports', reportId), {
    status: 'resolved',
    resolution: {
      state: 'approved',
      imageUrls: [],
      note: '',
      byModerator: true,
      reviewedAt: serverTimestamp(),
      reviewedBy: user.uid,
    },
    ...moderationStamp(user),
  });
}
