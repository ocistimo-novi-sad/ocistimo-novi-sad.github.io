import { useEffect, useRef } from 'react';
import type { LeafletEvent, Marker as LeafletMarker } from 'leaflet';
import { Marker, type MarkerProps } from 'react-leaflet';

/**
 * A map marker with a name for screen readers. Leaflet makes every marker a
 * button but names it only through `title`, which would also show the browser's
 * own tooltip next to ours, so the name goes in aria-label instead (#123).
 */
export function NamedMarker({ label, eventHandlers, ...props }: MarkerProps & { label: string }) {
  const marker = useRef<LeafletMarker>(null);

  useEffect(() => {
    marker.current?.getElement()?.setAttribute('aria-label', label);
  }, [label]);

  return (
    <Marker
      ref={marker}
      {...props}
      eventHandlers={{
        ...eventHandlers,
        // A marker added to the map again gets a new element without the name.
        add: (event: LeafletEvent) => {
          (event.target as LeafletMarker).getElement()?.setAttribute('aria-label', label);
          eventHandlers?.add?.(event);
        },
      }}
    />
  );
}
