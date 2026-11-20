import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { LIMITS } from '../config';
import { db, isFirebaseConfigured, requireDb } from './firebase';

export interface EnsuredProfile {
  /** The public author name, or null until the person picks one (#161). */
  publicName: string | null;
}

// Mirrored from useAuth so service-layer name stamps ("Odobrio", "Organizator")
// use the same public name as the rest of the app. It is per browser session,
// like the signed-in Firebase user the services already rely on.
let activePublicName: string | null = null;

export function setActivePublicName(value: string | null): void {
  activePublicName = value;
}

/** The public name, or null if the person has not chosen one yet. */
export function currentPublicName(): string | null {
  return activePublicName;
}

/** Counts characters, not UTF-16 units, matching Firestore's string size. */
export function publicNameLength(value: string): number {
  return Array.from(value).length;
}

/** A trimmed, single-spaced public name, capped at the allowed length. */
export function cleanPublicName(value: string): string {
  const normalised = value.trim().replace(/\s+/g, ' ');
  return Array.from(normalised).slice(0, LIMITS.publicNameMax).join('');
}

function storedPublicName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicName(value);
  return publicNameLength(cleaned) >= LIMITS.publicNameMin ? cleaned : null;
}

/**
 * Minimal profile. The e-mail address is private (readable by its owner and
 * admins) so admins can find people when assigning roles. Best effort:
 * failing here must never block sign-in or report creation. Returns null when
 * the profile could not be read or written, so the caller does not mistake an
 * offline failure for a person who has not chosen a public name yet.
 */
export async function ensureProfile(
  uid: string,
  displayName: string,
  email: string | null,
  photoURL: string | null,
): Promise<EnsuredProfile | null> {
  if (!isFirebaseConfigured || !db) return { publicName: null };
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
      const publicName = storedPublicName(snapshot.get('publicName'));
      // Keep the already-read name even if this best-effort write fails or is
      // waiting for the network. Otherwise a profile that was read correctly
      // would look like one without a public name.
      void updateDoc(reference, payload).catch(() => {});
      return { publicName };
    }

    await setDoc(reference, { ...payload, createdAt: serverTimestamp() });
    return { publicName: null };
  } catch {
    // Profiles are non-essential; ignore permission or offline errors.
    return null;
  }
}

/** Saves the public name and returns the cleaned value that was stored. */
export async function savePublicName(uid: string, publicName: string): Promise<string> {
  const name = cleanPublicName(publicName);
  await updateDoc(doc(requireDb(), 'users', uid), {
    publicName: name,
    lastSeenAt: serverTimestamp(),
  });
  return name;
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
