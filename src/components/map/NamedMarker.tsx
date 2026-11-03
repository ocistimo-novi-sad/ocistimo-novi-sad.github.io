import { useEffect, useRef } from 'react';
import type { Marker as LeafletMarker } from 'leaflet';
import { Marker, type MarkerProps } from 'react-leaflet';

/**
 * Leaflet renders a clickable marker as a button with no text, so screen
 * readers only announce "button" (WCAG 4.1.2). This gives it a name, and makes
 * Enter and Space open it like a click (WAI-ARIA button pattern).
 */
export function NamedMarker({ label, ...props }: MarkerProps & { label: string }) {
  const ref = useRef<LeafletMarker>(null);
  const inactive = props.interactive === false;

  // A new icon reuses the marker's element, but set these again to be safe.
  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    element.setAttribute('aria-label', label);
    // Leaflet makes every marker a button. One that does nothing right now (the
    // other reports while a new one is placed) is an image, out of the Tab order.
    element.tabIndex = inactive ? -1 : 0;
    element.setAttribute('role', inactive ? 'img' : 'button');
  }, [label, props.icon, inactive]);

  useEffect(() => {
    const element = ref.current?.getElement();
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== element || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      element.click();
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  }, [props.icon]);

  return <Marker ref={ref} {...props} />;
}
