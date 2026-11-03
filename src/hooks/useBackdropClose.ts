import { useRef, type PointerEvent } from 'react';

/**
 * Closes a dialog when the backdrop is pressed and released, not on the press
 * itself: sliding off before letting go cancels it (WCAG 2.5.2), and a text
 * selection that ends on the backdrop does not close anything.
 */
export function useBackdropClose(onClose: () => void) {
  const pressed = useRef(false);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      pressed.current = event.target === event.currentTarget;
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const released = document.elementFromPoint(event.clientX, event.clientY);
      if (pressed.current && released === event.currentTarget) onClose();
      pressed.current = false;
    },
    onPointerCancel: () => {
      pressed.current = false;
    },
  };
}
