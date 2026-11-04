import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open modal layers, newest last. Only the top one handles Tab and Escape. */
const layers: object[] = [];

/** Focusable elements inside `root` that are actually rendered. */
export function focusableIn(root: HTMLElement | null): HTMLElement[] {
  return [...(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
    (element) => element.getClientRects().length > 0,
  );
}

/** True when focus() on the element would land somewhere the user can see. */
export function canFocus(element: HTMLElement | null): element is HTMLElement {
  return Boolean(element?.isConnected && element !== document.body && element.getClientRects().length > 0);
}

/**
 * Focus for a modal layer (WAI-ARIA dialog pattern): focus moves inside when it
 * opens, Tab and Shift+Tab stay inside, Escape closes only the top layer, and
 * focus goes back to the element that opened it.
 */
export function useModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
  options: {
    /** Where focus starts; the first focusable element when it returns nothing. */
    initialFocus?: () => HTMLElement | null | undefined;
    /** Where focus goes on close when the opener is gone or hidden. */
    fallbackFocus?: () => HTMLElement | null | undefined;
  } = {},
) {
  const latest = useRef({ onEscape, ...options });

  useEffect(() => {
    latest.current = { onEscape, ...options };
  });

  useEffect(() => {
    const layer = {};
    layers.push(layer);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    (latest.current.initialFocus?.() ?? focusableIn(container)[0] ?? container)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== layer || !container) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        latest.current.onEscape();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableIn(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      const inside = active instanceof Node && container.contains(active);
      if (event.shiftKey && (!inside || active === items[0] || active === container)) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && (!inside || active === items[items.length - 1])) {
        event.preventDefault();
        items[0].focus();
      }
    };
    // Capture phase on window, so Escape never reaches the panel under this layer.
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      layers.splice(layers.indexOf(layer), 1);
      const target = canFocus(opener) ? opener : latest.current.fallbackFocus?.();
      target?.focus({ preventScroll: true });
    };
  }, [containerRef]);
}
