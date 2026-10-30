import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

type Snap = 'peek' | 'half' | 'full';

// Bottom-sheet stops as fractions of the viewport height (responsive.css sets
// the matching heights). Dragging below CLOSE_RATIO dismisses the sheet.
const SNAPS: { snap: Snap; ratio: number }[] = [
  { snap: 'peek', ratio: 0.4 },
  { snap: 'half', ratio: 0.64 },
  { snap: 'full', ratio: 0.92 },
];
const CLOSE_RATIO = 0.24;
const DRAG_THRESHOLD = 6;

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
  const [snap, setSnap] = useState<Snap>('half');
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const initialCollapseSignal = useRef(collapseSignal);

  // Collapse to the smallest stop so the map behind the sheet is usable.
  useEffect(() => {
    if (collapseSignal === undefined || collapseSignal === initialCollapseSignal.current) return;
    setSnap('peek');
  }, [collapseSignal]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Move focus into the drawer when it opens and hand it back when it closes.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    if (drawer && !drawer.contains(document.activeElement)) drawer.focus({ preventScroll: true });
    return () => {
      if (previous && previous !== document.body && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    suppressClick.current = false;
    drag.current = {
      startY: event.clientY,
      startHeight: drawer.getBoundingClientRect().height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) return;
    const delta = event.clientY - state.startY;
    if (!state.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    state.moved = true;
    const maxHeight = window.innerHeight * SNAPS[SNAPS.length - 1].ratio;
    setDragHeight(Math.min(maxHeight, Math.max(0, state.startHeight - delta)));
  };

  const onHandlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved) return;

    suppressClick.current = true;
    setDragHeight(null);
    const ratio = (state.startHeight - (event.clientY - state.startY)) / window.innerHeight;
    if (ratio < CLOSE_RATIO) {
      onClose();
      return;
    }
    const nearest = SNAPS.reduce((best, stop) =>
      Math.abs(stop.ratio - ratio) < Math.abs(best.ratio - ratio) ? stop : best,
    );
    setSnap(nearest.snap);
  };

  const onHandlePointerCancel = () => {
    drag.current = null;
    setDragHeight(null);
  };

  const onHandleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSnap((value) => (value === 'full' ? 'half' : 'full'));
  };

  const expanded = snap === 'full';
  const classes = [
    'drawer',
    isMobile ? `is-${snap}` : '',
    dragHeight !== null ? 'is-dragging' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside
      ref={drawerRef}
      className={classes}
      style={dragHeight !== null ? { height: dragHeight } : undefined}
      role="dialog"
      aria-label={label}
      aria-modal={isMobile || undefined}
      tabIndex={-1}
    >
      {isMobile ? (
        <button
          type="button"
          className="drawer__handle"
          onClick={onHandleClick}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
          aria-label={expanded ? 'Smanji panel' : 'Proširi panel'}
          aria-expanded={expanded}
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
