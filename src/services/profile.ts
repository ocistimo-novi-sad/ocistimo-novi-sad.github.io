import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, requireDb } from './firebase';

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

/**
 * Which e-mails the person wants (#79), stored in users/{uid}.mailPrefs.
 * `myReports`: news about their own reports. `moderation`: new work for
 * moderators. Only an explicit false turns a kind off; the Cloud Functions
 * read it in functions/src/recipients.ts.
 */
export type MailKind = 'myReports' | 'moderation';
export type MailPrefs = Record<MailKind, boolean>;

export const DEFAULT_MAIL_PREFS: MailPrefs = { myReports: true, moderation: true };

export async function fetchMailPrefs(uid: string): Promise<MailPrefs> {
  const snapshot = await getDoc(doc(requireDb(), 'users', uid));
  const stored: unknown = snapshot.get('mailPrefs');
  const prefs = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  return {
    myReports: prefs.myReports !== false,
    moderation: prefs.moderation !== false,
  };
}

/** Saves one kind. The profile exists, since sign-in creates it. */
export async function saveMailPref(uid: string, kind: MailKind, enabled: boolean): Promise<void> {
  await updateDoc(doc(requireDb(), 'users', uid), {
    [`mailPrefs.${kind}`]: enabled,
    lastSeenAt: serverTimestamp(),
  });
}
