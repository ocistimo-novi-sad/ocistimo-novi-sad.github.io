import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, requireAuth, requireDb } from './firebase';
import { AppError } from './errors';
import type { UserProfile, UserRole } from '../types';

/**
 * Roles live in two allow lists. /admins is writable only from the Firebase
 * console; /moderators is written by admins from the app. Security Rules
 * enforce both, these reads only tell the client which UI to show.
 */
export async function fetchRole(uid: string): Promise<UserRole> {
  if (!isFirebaseConfigured || !db) return 'user';

  const [admin, moderator] = await Promise.allSettled([
    getDoc(doc(db, 'admins', uid)),
    getDoc(doc(db, 'moderators', uid)),
  ]);

  if (admin.status === 'fulfilled' && admin.value.exists()) return 'admin';
  if (moderator.status === 'fulfilled' && moderator.value.exists()) return 'moderator';
  return 'user';
}

function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

const USERS_LIMIT = 500;

/** Admin only: every profile with its role, most recently active first. */
export async function listUsers(): Promise<UserProfile[]> {
  const db = requireDb();
  const [users, admins, moderators] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('lastSeenAt', 'desc'), limit(USERS_LIMIT))),
    getDocs(collection(db, 'admins')),
    getDocs(collection(db, 'moderators')),
  ]);

  const adminIds = new Set(admins.docs.map((document) => document.id));
  const moderatorIds = new Set(moderators.docs.map((document) => document.id));

  return users.docs.map((document) => {
    const data = document.data();
    const role: UserRole = adminIds.has(document.id)
      ? 'admin'
      : moderatorIds.has(document.id)
        ? 'moderator'
        : 'user';
    return {
      uid: document.id,
      displayName: asOptionalString(data.displayName) ?? 'Član zajednice',
      email: asOptionalString(data.email),
      photoURL: asOptionalString(data.photoURL),
      createdAt: asDate(data.createdAt),
      lastSeenAt: asDate(data.lastSeenAt),
      role,
    };
  });
}

export async function setModerator(user: UserProfile, enabled: boolean): Promise<void> {
  const db = requireDb();
  const admin = requireAuth().currentUser;
  if (!admin) {
    throw new AppError('unauthenticated', 'Prijavite se kao administrator.');
  }

  const reference = doc(db, 'moderators', user.uid);
  if (!enabled) {
    await deleteDoc(reference);
    return;
  }

  const payload: Record<string, unknown> = {
    displayName: user.displayName.slice(0, 80),
    addedBy: admin.uid,
    addedAt: serverTimestamp(),
  };
  if (user.email) payload.email = user.email;

  await setDoc(reference, payload);
}
