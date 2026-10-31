import { HandHeart, Megaphone } from 'lucide-react';
import type { Report } from '../../types';

/** "What we can do ourselves / what we need help with" pair of cards. */
export function ReportPlan({ report }: { report: Pick<Report, 'communityCan' | 'helpNeeded'> }) {
  if (!report.communityCan && !report.helpNeeded) return null;

  return (
    <div className="report-plan">
      {report.communityCan ? (
        <div className="report-plan__card report-plan__card--can">
          <p className="report-plan__title">
            <HandHeart size={14} aria-hidden="true" /> Zajednica može sama
          </p>
          <p className="report-plan__text">{report.communityCan}</p>
        </div>
      ) : null}
      {report.helpNeeded ? (
        <div className="report-plan__card report-plan__card--help">
          <p className="report-plan__title">
            <Megaphone size={14} aria-hidden="true" /> Potrebna je pomoć
          </p>
          <p className="report-plan__text">{report.helpNeeded}</p>
        </div>
      ) : null}
    </div>
  );
}
