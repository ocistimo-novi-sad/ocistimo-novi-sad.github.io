import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Minimal profile. The e-mail address is private (readable by its owner and
 * admins) so admins can find people when assigning roles. Best effort:
 * failing here must never block sign-in or report creation.
 */
export async function ensureProfile(
  uid: string,
  displayName: string,
  email: string | null,
  photoURL: string | null,
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const reference = doc(db, 'users', uid);
    const snapshot = await getDoc(reference);

    const payload: Record<string, unknown> = {
      displayName: displayName.slice(0, 80),
      lastSeenAt: serverTimestamp(),
    };
    if (email) payload.email = email;
    if (photoURL) payload.photoURL = photoURL;

    if (snapshot.exists()) {
      await updateDoc(reference, payload);
      return;
    }

    await setDoc(reference, { ...payload, createdAt: serverTimestamp() });
  } catch {
    // Profiles are non-essential; ignore permission or offline errors.
  }
}
