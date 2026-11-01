import { getFirestore } from 'firebase-admin/firestore';

/**
 * Recipients are uids. The Trigger Email extension looks up each address in
 * users/{uid}.email, which every signed-in user writes at sign-in.
 */

/** Moderators and admins, without the person who caused the event. */
export async function staffUids(except: string): Promise<string[]> {
  const db = getFirestore();
  const [moderators, admins] = await Promise.all([
    db.collection('moderators').select().get(),
    db.collection('admins').select().get(),
  ]);
  const uids = new Set([...moderators.docs, ...admins.docs].map((document) => document.id));
  uids.delete(except);
  return [...uids];
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
  return [...uids];
}
