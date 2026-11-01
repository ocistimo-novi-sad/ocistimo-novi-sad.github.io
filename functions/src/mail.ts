import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface Message {
  subject: string;
  text: string;
  html: string;
}

/** A document in the shape the Trigger Email extension reads. */
export interface Mail {
  toUids?: string[];
  bccUids?: string[];
  message: Message;
}

const ALREADY_EXISTS = 6;

/**
 * Queues a mail for the Trigger Email extension. The id is derived from the
 * triggering event, so an event delivered twice does not send twice.
 */
export async function queueMail(id: string, mail: Mail): Promise<void> {
  if (!mail.toUids?.length && !mail.bccUids?.length) {
    logger.info('No recipients, mail skipped', { id, subject: mail.message.subject });
    return;
  }
  try {
    await getFirestore().collection('mail').doc(id).create(mail);
  } catch (error) {
    if ((error as { code?: unknown }).code === ALREADY_EXISTS) return;
    throw error;
  }
}
