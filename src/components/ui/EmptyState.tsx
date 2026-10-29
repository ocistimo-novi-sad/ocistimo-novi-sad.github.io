import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export function Spinner({ size = 16 }: { size?: number }) {
  return <LoaderCircle size={size} className="spinner" aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__text">{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="section-label">{children}</h3>;
}
