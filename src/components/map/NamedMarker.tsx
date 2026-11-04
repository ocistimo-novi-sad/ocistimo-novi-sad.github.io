import { useEffect, useRef } from 'react';
import type { Marker as LeafletMarker } from 'leaflet';
import { Marker, type MarkerProps } from 'react-leaflet';

/**
 * Leaflet renders a clickable marker as a button with no text, so screen
 * readers only announce "button" (WCAG 4.1.2). This gives it a name.
 */
export function NamedMarker({ label, ...props }: MarkerProps & { label: string }) {
  const ref = useRef<LeafletMarker>(null);

  // A new icon reuses the marker's element, but set the name again to be safe.
  useEffect(() => {
    ref.current?.getElement()?.setAttribute('aria-label', label);
  }, [label, props.icon]);

  return <Marker ref={ref} {...props} />;
}
