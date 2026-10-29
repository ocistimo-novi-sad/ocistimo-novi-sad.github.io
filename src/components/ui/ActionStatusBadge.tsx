import { ACTION_STATUS_MAP } from '../../config';
import type { ActionStatus } from '../../types';

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span className={`action-status action-status--${status}`}>
      {ACTION_STATUS_MAP[status]}
    </span>
  );
}
