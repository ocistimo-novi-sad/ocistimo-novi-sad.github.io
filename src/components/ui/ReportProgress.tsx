import type { Report } from '../../types';

interface Step {
  label: string;
  rejected?: boolean;
}

/**
 * Where a report is on its way from "reported" to "fixed", so readers see at a
 * glance what has happened and what comes next.
 */
export function ReportProgress({ report }: { report: Report }) {
  const { moderation, status } = report;

  let steps: Step[];
  let current: number;
  if (moderation === 'rejected') {
    steps = [{ label: 'Prijavljena' }, { label: 'Odbijena', rejected: true }];
    current = 1;
  } else if (moderation === 'pending') {
    steps = [
      { label: 'Prijavljena' },
      { label: 'Na pregledu' },
      { label: 'Akcija planirana' },
      { label: 'Rešena' },
    ];
    current = 1;
  } else if (status === 'not_suitable') {
    steps = [{ label: 'Prijavljena' }, { label: 'Objavljena' }, { label: 'Nije za akciju' }];
    current = 2;
  } else {
    steps = [
      { label: 'Prijavljena' },
      { label: 'Objavljena' },
      { label: status === 'in_progress' ? 'Akcija u toku' : 'Akcija planirana' },
      { label: 'Rešena' },
    ];
    current =
      status === 'resolved' ? 3 : status === 'planned' || status === 'in_progress' ? 2 : 1;
  }

  return (
    <ol className="progress" aria-label="Tok prijave">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={[
            index < current ? 'is-done' : '',
            index === current ? 'is-current' : '',
            step.rejected ? 'is-rejected' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="progress__dot" aria-hidden="true" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}
