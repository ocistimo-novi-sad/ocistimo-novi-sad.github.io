import { useEffect, useRef } from 'react';
import type { Marker as LeafletMarker } from 'leaflet';
import { Marker, useMap, type MarkerProps } from 'react-leaflet';
import { prefersReducedMotion } from '../../lib/motion';
import { drawerOffset } from './drawer-offset';

/**
 * Leaflet renders a clickable marker as a button with no text, so screen
 * readers only announce "button" (WCAG 4.1.2). This gives it a name, and makes
 * Enter and Space open it like a click (WAI-ARIA button pattern).
 */
export function NamedMarker({ label, ...props }: MarkerProps & { label: string }) {
  const map = useMap();
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
    const marker = ref.current;
    const element = marker?.getElement();
    if (!marker || !element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== element || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      element.click();
      // A group of reports goes away when it opens; focus then stays on the map.
      window.setTimeout(() => {
        if (!element.isConnected && document.activeElement === document.body) {
          map.getContainer().focus({ preventScroll: true });
        }
      }, 900);
    };
    // A focused marker under the panel, the search bar or the legend comes to
    // the middle of the visible map (WCAG 2.4.11).
    const onFocus = () => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (hit && (hit === element || element.contains(hit))) return;
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const size = map.getSize();
      const [dx, dy] = drawerOffset();
      map.panBy([point.x - (size.x / 2 - dx), point.y - (size.y / 2 - dy)], {
        animate: !prefersReducedMotion(),
      });
    };
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('focus', onFocus);
    return () => {
      element.removeEventListener('keydown', onKeyDown);
      element.removeEventListener('focus', onFocus);
    };
  }, [map, props.icon]);

  // Leaflet closes a tooltip as soon as the pointer leaves the marker, so it
  // can't be read by moving onto it. It closes a moment later instead, and
  // stays while the pointer is on it (WCAG 1.4.13).
  useEffect(() => {
    const marker = ref.current;
    if (!marker?.getTooltip()) return;
    let timer = 0;
    const keep = () => window.clearTimeout(timer);
    const closeSoon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => marker.closeTooltip(), 300);
    };
    const onOpen = () => {
      const tooltip = marker.getTooltip()?.getElement();
      tooltip?.addEventListener('mouseenter', keep);
      tooltip?.addEventListener('mouseleave', closeSoon);
    };
    marker.off('mouseout', marker.closeTooltip, marker);
    marker.on('mouseout', closeSoon);
    marker.on('mouseover', keep);
    marker.on('tooltipopen', onOpen);
    return () => {
      window.clearTimeout(timer);
      marker.off('mouseout', closeSoon);
      marker.off('mouseover', keep);
      marker.off('tooltipopen', onOpen);
    };
  }, []);

  return <Marker ref={ref} autoPanOnFocus={false} {...props} />;
}
