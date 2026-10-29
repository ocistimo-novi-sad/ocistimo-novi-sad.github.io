import type { Bounds, Coordinates, Report } from '../types';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in metres. */
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinBounds(point: Coordinates, bounds: Bounds): boolean {
  return (
    point.latitude >= bounds.south &&
    point.latitude <= bounds.north &&
    point.longitude >= bounds.west &&
    point.longitude <= bounds.east
  );
}

export function boundsFromReports(reports: Report[]): Bounds | null {
  if (reports.length === 0) return null;
  const latitudes = reports.map((report) => report.latitude);
  const longitudes = reports.map((report) => report.longitude);
  return {
    south: Math.min(...latitudes),
    west: Math.min(...longitudes),
    north: Math.max(...latitudes),
    east: Math.max(...longitudes),
  };
}

/** Validates the Novi Sad operating area (mirrors Firestore Rules). */
export function isInServiceArea(point: Coordinates): boolean {
  return (
    point.latitude >= 45.05 &&
    point.latitude <= 45.45 &&
    point.longitude >= 19.55 &&
    point.longitude <= 20.05
  );
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function openStreetMapUrl(point: Coordinates, zoom = 18): string {
  const lat = point.latitude.toFixed(6);
  const lng = point.longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}
