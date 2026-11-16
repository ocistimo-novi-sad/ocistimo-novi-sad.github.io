import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronLeft, ChevronUp, X } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

/** The three heights of the drawer on a phone. CSS owns the actual values. */
type Snap = 'peek' | 'normal' | 'full';
const SNAPS: Snap[] = ['peek', 'normal', 'full'];
const SNAP_CLASS: Record<Snap, string> = { peek: ' is-peek', normal: '', full: ' is-expanded' };

/** Measures how tall the drawer is at a snap point by briefly applying its class. */
function snapHeight(drawer: HTMLElement, snap: Snap): number {
  const { className } = drawer;
  const { height, transition } = drawer.style;
  drawer.style.transition = 'none';
  drawer.style.height = '';
  drawer.className = className.replace(/ is-(peek|expanded)/g, '') + SNAP_CLASS[snap];
  const measured = drawer.getBoundingClientRect().height;
  drawer.className = className;
  drawer.style.height = height;
  drawer.style.transition = transition;
  return measured;
}

interface DragState {
  startY: number;
  startHeight: number;
  heights: Record<Snap, number>;
  lastY: number;
  lastTime: number;
  /** Pixels per millisecond, positive when moving up. */
  velocity: number;
  moved: boolean;
}

export function Drawer({
  label,
  onClose,
  children,
  footer,
  className = '',
  collapseSignal,
  onBack,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  collapseSignal?: number;
  /** Phone only: a "Lista" button that closes the drawer back to the list. */
  onBack?: () => void;
}) {
  const isMobile = useIsMobile();
  const [snap, setSnap] = useState<Snap>('normal');
  const drawerRef = useRef<HTMLElement>(null);
  const drag = useRef<DragState | null>(null);
  // A drag ends with a click on the handle in some browsers; that click must not toggle.
  const suppressClick = useRef(false);

  useEffect(() => {
    if (collapseSignal === undefined) return;
    setSnap('normal');
  }, [collapseSignal]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drawer = drawerRef.current;
    suppressClick.current = false;
    if (!drawer) return;
    drag.current = {
      startY: event.clientY,
      startHeight: drawer.getBoundingClientRect().height,
      heights: {
        peek: snapHeight(drawer, 'peek'),
        normal: snapHeight(drawer, 'normal'),
        full: snapHeight(drawer, 'full'),
      },
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    const drawer = drawerRef.current;
    if (!state || !drawer) return;
    const distance = state.startY - event.clientY;
    if (!state.moved && Math.abs(distance) < 6) return;
    state.moved = true;
    state.velocity = (state.lastY - event.clientY) / Math.max(1, event.timeStamp - state.lastTime);
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    drawer.style.transition = 'none';
    drawer.style.height = `${Math.max(0, Math.min(state.heights.full + 16, state.startHeight + distance))}px`;
  };

  const endDrag = () => {
    const state = drag.current;
    const drawer = drawerRef.current;
    drag.current = null;
    if (!state || !drawer || !state.moved) return;
    suppressClick.current = true;
    const height = drawer.getBoundingClientRect().height;
    const { heights } = state;
    drawer.style.transition = '';

    // Dragged well below the lowest position, or flicked down from it: close.
    if (height < heights.peek * 0.6 || (state.velocity < -0.6 && height < heights.peek)) {
      onClose();
      return;
    }

    let index = SNAPS.reduce(
      (best, name, i) =>
        Math.abs(heights[name] - height) < Math.abs(heights[SNAPS[best]] - height) ? i : best,
      0,
    );
    // A quick flick moves one position further than where the finger stopped.
    if (state.velocity > 0.5 && heights[SNAPS[index]] <= height && index < SNAPS.length - 1) {
      index += 1;
    } else if (state.velocity < -0.5 && heights[SNAPS[index]] >= height && index > 0) {
      index -= 1;
    }
    const target = SNAPS[index];
    drawer.style.height = `${heights[target]}px`;
    setSnap(target);
    // Once the slide is over, hand the height back to the stylesheet.
    window.setTimeout(() => {
      if (drawerRef.current && !drag.current) drawerRef.current.style.height = '';
    }, 360);
  };

  const toggle = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSnap((value) => (value === 'full' ? 'normal' : value === 'peek' ? 'normal' : 'full'));
  };

  return (
    <aside
      ref={drawerRef}
      className={`drawer${SNAP_CLASS[snap]}${isMobile && onBack ? ' has-back' : ''}${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-label={label}
    >
      {isMobile ? (
        <button
          type="button"
          className="drawer__handle"
          onClick={toggle}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label={snap === 'full' ? 'Smanji panel' : 'Proširi panel'}
        >
          <span className="drawer__grip" aria-hidden="true" />
          {snap === 'full' ? (
            <ChevronDown size={14} aria-hidden="true" />
          ) : (
            <ChevronUp size={14} aria-hidden="true" />
          )}
        </button>
      ) : null}

      {isMobile && onBack ? (
        <button type="button" className="drawer__back" onClick={onBack}>
          <ChevronLeft size={16} aria-hidden="true" />
          Lista
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
