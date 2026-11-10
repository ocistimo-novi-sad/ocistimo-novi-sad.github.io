import { getFirestore } from 'firebase-admin/firestore';

/**
 * Recipients are uids. The Trigger Email extension looks up each address in
 * users/{uid}.email, which every signed-in user writes at sign-in.
 *
 * Every mail picks its recipients here, so who hears about what is decided in
 * one place. Future rules (following a single report, moderating one part of
 * the city) belong here too.
 */

/**
 * The kinds of mail a person can turn off, as keys of users/{uid}.mailPrefs:
 * news about their own reports, and new work for moderators.
 */
export type MailKind = 'myReports' | 'moderation';

/**
 * Drops the people who turned this kind of mail off. Only an explicit `false`
 * turns it off: a missing profile, map or key means the mail is on, so nobody
 * needs a migration and the default is "on".
 */
export async function withMailEnabled(uids: string[], kind: MailKind): Promise<string[]> {
  if (!uids.length) return [];
  const db = getFirestore();
  const profiles = await db.getAll(...uids.map((uid) => db.doc(`users/${uid}`)));
  const off = new Set(
    profiles
      .filter((profile) => profile.get(`mailPrefs.${kind}`) === false)
      .map((profile) => profile.id),
  );
  return uids.filter((uid) => !off.has(uid));
}

/** The author of a report, unless they caused the event or turned the mail off. */
export async function authorUids(author: string, except: string): Promise<string[]> {
  if (!author || author === except) return [];
  return withMailEnabled([author], 'myReports');
}

/** Moderators and admins, without the person who caused the event. */
export async function staffUids(except: string): Promise<string[]> {
  const db = getFirestore();
  const [moderators, admins] = await Promise.all([
    db.collection('moderators').select().get(),
    db.collection('admins').select().get(),
  ]);
  const uids = new Set([...moderators.docs, ...admins.docs].map((document) => document.id));
  uids.delete(except);
  return withMailEnabled([...uids], 'moderation');
}

/** Authors of the given reports, each once. */
export async function reportAuthors(reportIds: string[], except: string): Promise<string[]> {
  if (!reportIds.length) return [];
  const db = getFirestore();
  const reports = await db.getAll(...reportIds.map((id) => db.doc(`reports/${id}`)));
  const uids = new Set(
    reports
      .map((report) => report.get('createdBy') as unknown)
      .filter((uid): uid is string => typeof uid === 'string' && uid !== ''),
  );
  uids.delete(except);
  return withMailEnabled([...uids], 'myReports');
}
