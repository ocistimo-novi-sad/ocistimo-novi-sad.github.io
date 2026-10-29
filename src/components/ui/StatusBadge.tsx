import { STATUS_MAP } from '../../config';
import type { ReportStatus } from '../../types';

export function StatusBadge({
  status,
  compact = false,
}: {
  status: ReportStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`status-badge status-badge--${status}${compact ? ' is-compact' : ''}`}
      title={STATUS_MAP[status].description}
    >
      <span className="status-badge__dot" aria-hidden="true" />
      <span>{STATUS_MAP[status].label}</span>
    </span>
  );
}

export function StatusDot({ status }: { status: ReportStatus }) {
  return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />;
}
