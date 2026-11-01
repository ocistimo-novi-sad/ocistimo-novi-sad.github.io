import type { ActionEvent, ReportEvent } from './events.js';
import type { Message } from './mail.js';

const SITE_URL = 'https://ocistimo-novi-sad.github.io/';
const APP_NAME = 'Kuka i Motika';

/** Same labels as FLAG_REASONS in src/config.ts. */
const FLAG_REASON_LABELS: Record<string, string> = {
  spam: 'Spam ili reklama',
  duplicate: 'Dupla prijava',
  misleading: 'Netačna ili obmanjujuća prijava',
  inappropriate: 'Neprimeren sadržaj',
  other: 'Drugo',
};

export interface ReportSummary {
  id: string;
  title: string;
  authorName: string;
}

export interface ActionSummary {
  title: string;
  date: Date | null;
  meetingPoint: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function reportUrl(reportId: string): string {
  return `${SITE_URL}?prijava=${encodeURIComponent(reportId)}`;
}

/** Plain paragraphs and one link, as both text and simple HTML. */
function compose(subject: string, paragraphs: string[], link: { url: string; label: string }): Message {
  const footer = `Ovu poruku šalje aplikacija ${APP_NAME}. Na nju ne treba odgovarati.`;
  const text = [...paragraphs, `${link.label}: ${link.url}`, '--', footer].join('\n\n');
  const html = [
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`,
    `<p style="color:#6b7280;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join('\n');
  return { subject: `${subject} – ${APP_NAME}`, text, html };
}

function formatDate(date: Date | null): string {
  if (!date) return 'datum će biti naknadno objavljen';
  return date.toLocaleString('sr-Latn-RS', {
    timeZone: 'Europe/Belgrade',
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export function reportMessage(event: ReportEvent, report: ReportSummary): Message {
  const title = `„${report.title}”`;
  const author = report.authorName ? ` Autor: ${report.authorName}.` : '';
  const toReview = { url: reportUrl(report.id), label: 'Otvori prijavu' };

  switch (event.kind) {
    case 'submitted':
      return event.resubmitted
        ? compose(
            'Ispravljena prijava čeka pregled',
            [`Odbijena prijava ${title} je ispravljena i ponovo čeka pregled.${author}`],
            toReview,
          )
        : compose(
            'Nova prijava čeka pregled',
            [`Stigla je nova prijava ${title} i čeka pregled pre objavljivanja.${author}`],
            toReview,
          );
    case 'edited':
      return compose(
        'Izmena objavljene prijave',
        [
          `Objavljena prijava ${title} je izmenjena.${author}`,
          'Izmena je već vidljiva, a prethodna verzija je sačuvana dok je ne pregledate.',
        ],
        toReview,
      );
    case 'approved':
      return compose(
        'Prijava je objavljena',
        [`Vaša prijava ${title} je odobrena i sada je vidljiva na mapi. Hvala što ste je poslali!`],
        toReview,
      );
    case 'rejected':
      return compose(
        'Prijava nije objavljena',
        [
          `Vaša prijava ${title} nije odobrena.`,
          `Razlog: ${event.reason || 'nije naveden'}`,
          'Prijavu možete da ispravite u odeljku „Moje prijave” i ponovo pošaljete na pregled.',
        ],
        toReview,
      );
    case 'proof-submitted':
      return compose(
        'Dokaz sanacije čeka potvrdu',
        [`Za prijavu ${title} poslat je dokaz da je problem rešen.${author}`],
        toReview,
      );
    case 'proof-approved':
      return compose(
        'Problem je rešen',
        [
          event.byModerator
            ? `Vaša prijava ${title} je označena kao rešena.`
            : `Vaš dokaz sanacije je potvrđen i prijava ${title} je označena kao rešena.`,
          'Hvala što pomažete da Novi Sad bude uredniji!',
        ],
        toReview,
      );
    case 'proof-rejected':
      return compose(
        'Dokaz sanacije nije prihvaćen',
        [
          `Dokaz sanacije za vašu prijavu ${title} nije prihvaćen.`,
          `Razlog: ${event.reason || 'nije naveden'}`,
          'Možete da pošaljete novi dokaz iz detalja prijave.',
        ],
        toReview,
      );
  }
}

export function flagMessage(
  report: ReportSummary,
  flag: { reason: string; note: string },
): Message {
  const reason = FLAG_REASON_LABELS[flag.reason] ?? FLAG_REASON_LABELS.other;
  return compose(
    'Prijavljen sporan sadržaj',
    [
      `Prijava „${report.title}” je označena kao sporan sadržaj.`,
      `Razlog: ${reason}`,
      ...(flag.note ? [`Napomena: ${flag.note}`] : []),
    ],
    { url: reportUrl(report.id), label: 'Otvori prijavu' },
  );
}

export function actionMessage(kind: ActionEvent['kind'], action: ActionSummary): Message {
  const title = `„${action.title}”`;
  const toActions = { url: SITE_URL, label: 'Otvori Kuka i Motika' };

  if (kind === 'cancelled') {
    return compose(
      'Akcija je otkazana',
      [`Akcija čišćenja ${title}, zakazana za ${formatDate(action.date)}, je otkazana.`],
      toActions,
    );
  }
  return compose(
    'Akcija čišćenja za vašu prijavu',
    [
      `Vaša prijava je uključena u akciju čišćenja ${title}.`,
      `Kada: ${formatDate(action.date)}`,
      ...(action.meetingPoint ? [`Mesto okupljanja: ${action.meetingPoint}`] : []),
      'Pridružite se ako možete. Svaka pomoć je dobrodošla!',
    ],
    toActions,
  );
}
