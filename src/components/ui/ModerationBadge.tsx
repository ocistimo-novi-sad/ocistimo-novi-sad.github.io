import { MODERATION_LABELS } from '../../config';
import type { ModerationState } from '../../types';

export function ModerationBadge({ state }: { state: ModerationState }) {
  return (
    <span
      className={`moderation-badge moderation-badge--${state}`}
      title={MODERATION_LABELS[state].description}
    >
      <span className="moderation-badge__dot" aria-hidden="true" />
      {MODERATION_LABELS[state].label}
    </span>
  );
}
