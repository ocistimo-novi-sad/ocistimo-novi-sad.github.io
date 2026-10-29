import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

export function Drawer({
  label,
  onClose,
  children,
  footer,
  className = '',
  collapseSignal,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  collapseSignal?: number;
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapseSignal === undefined) return;
    setExpanded(false);
  }, [collapseSignal]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside
      className={`drawer${expanded ? ' is-expanded' : ''}${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-label={label}
    >
      {isMobile ? (
        <button
          type="button"
          className="drawer__handle"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Smanji panel' : 'Proširi panel'}
        >
          <span className="drawer__grip" aria-hidden="true" />
          {expanded ? (
            <ChevronDown size={14} aria-hidden="true" />
          ) : (
            <ChevronUp size={14} aria-hidden="true" />
          )}
        </button>
      ) : null}

      <button type="button" className="drawer__close" onClick={onClose} aria-label="Zatvori panel">
        <X size={16} aria-hidden="true" />
      </button>

      <div className="drawer__scroll">{children}</div>
      {footer ? <div className="drawer__foot">{footer}</div> : null}
    </aside>
  );
}
