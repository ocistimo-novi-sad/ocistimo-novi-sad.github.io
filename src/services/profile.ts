import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Administrator rights live only in the /admins collection, which is writable
 * exclusively from the Firebase console (Security Rules deny client writes).
 * This read is also how the client discovers its own role.
 */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    const snapshot = await getDoc(doc(db, 'admins', uid));
    return snapshot.exists();
  } catch {
    return false;
  }
}

/**
 * Optional minimal profile. Best effort: failing here must never block sign-in
 * or report creation.
 */
export async function ensureProfile(
  uid: string,
  displayName: string,
  photoURL: string | null,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const reference = doc(db, 'users', uid);
    const snapshot = await getDoc(reference);
    if (snapshot.exists()) return;

    const payload: Record<string, unknown> = {
      displayName: displayName.slice(0, 80),
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    };
    if (photoURL) payload.photoURL = photoURL;

    await setDoc(reference, payload);
  } catch {
    // Profiles are non-essential; ignore permission or offline errors.
  }
}
