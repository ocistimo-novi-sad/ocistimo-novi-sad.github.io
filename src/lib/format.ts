/** Serbian (Latin) formatting helpers. */

const dateFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  day: 'numeric',
  month: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const weekdayFormatter = new Intl.DateTimeFormat('sr-Latn-RS', {
  weekday: 'long',
});

/** Serbian plural: 1 sat / 2 sata / 5 sati. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} u ${formatTime(date)}`;
}

export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatDate(date);

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'upravo sada';
  if (minutes < 60) return `pre ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `pre ${hours} ${plural(hours, 'sat', 'sata', 'sati')}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'juče';
  if (days < 7) return `pre ${days} dana`;
  return formatDate(date);
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const latHemisphere = latitude >= 0 ? 'N' : 'S';
  const lngHemisphere = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(latitude).toFixed(5)}° ${latHemisphere}, ${Math.abs(longitude).toFixed(5)}° ${lngHemisphere}`;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 950) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }
  const km = meters / 1000;
  const value = km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toString();
  return `${value} km`;
}

export function formatReportCount(count: number): string {
  return `${count} ${plural(count, 'prijava', 'prijave', 'prijava')}`;
}

export function formatActionCount(count: number): string {
  return `${count} ${plural(count, 'akcija', 'akcije', 'akcija')}`;
}

/** Short "12. okt" style label used on action date blocks. */
export function splitDate(date: Date): { day: string; month: string; year: string } {
  return {
    day: new Intl.DateTimeFormat('sr-Latn-RS', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('sr-Latn-RS', { month: 'short' })
      .format(date)
      .replace('.', ''),
    year: new Intl.DateTimeFormat('sr-Latn-RS', { year: 'numeric' }).format(date),
  };
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
