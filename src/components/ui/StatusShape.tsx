import type { ReportStatus } from '../../types';
import { statusBadge } from '../map/map-icons';

/** The status mark from the map pins, for the legend and the filters. */
export function StatusShape({ status }: { status: ReportStatus }) {
  // statusBadge() returns fixed markup built from our own glyphs.
  return (
    <span
      className="status-shape"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: statusBadge(status) }}
    />
  );
}
