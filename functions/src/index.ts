import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { actionEvents, isForStaff, reportEvents } from './events.js';
import { queueMail } from './mail.js';
import { reportAuthors, staffUids } from './recipients.js';
import { actionMessage, flagMessage, reportMessage, type ReportSummary } from './templates.js';

initializeApp();

// The database is in eur3, whose triggers run in europe-west1.
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function summarize(id: string, data: DocumentData | undefined): ReportSummary {
  return {
    id,
    title: asString(data?.title) || 'Bez naslova',
    authorName: asString(data?.createdByName),
  };
}

/** Moderation and proof decisions to the author, new work to moderators. */
export const onReportWritten = onDocumentWritten('reports/{reportId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const report = summarize(event.params.reportId, after);
  const author = asString(after?.createdBy);
  const moderator = asString(after?.moderatedBy);

  for (const change of reportEvents(before, after)) {
    const id = `${event.id}-${change.kind}`;
    const message = reportMessage(change, report);
    if (isForStaff(change)) {
      await queueMail(id, { bccUids: await staffUids(author), message });
    } else if (author && author !== moderator) {
      await queueMail(id, { toUids: [author], message });
    }
  }
});

export const onFlagCreated = onDocumentCreated('flags/{flagId}', async (event) => {
  const flag = event.data?.data();
  const reportId = asString(flag?.reportId);
  if (!flag || !reportId) return;

  const report = await getFirestore().doc(`reports/${reportId}`).get();
  await queueMail(event.id, {
    bccUids: await staffUids(asString(flag.createdBy)),
    message: flagMessage(summarize(reportId, report.data()), {
      reason: asString(flag.reason),
      note: asString(flag.note),
    }),
  });
});

/** Authors of linked reports hear when an action is planned or cancelled. */
export const onActionWritten = onDocumentWritten('actions/{actionId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) return;

  const action = {
    title: asString(after.title) || 'Akcija čišćenja',
    date: after.date instanceof Timestamp ? after.date.toDate() : null,
    meetingPoint: asString(after.meetingPoint),
  };
  for (const change of actionEvents(before, after)) {
    await queueMail(`${event.id}-${change.kind}`, {
      bccUids: await reportAuthors(change.reportIds, asString(after.createdBy)),
      message: actionMessage(change.kind, action),
    });
  }
});
