import L, { type DivIcon } from 'leaflet';
import { CATEGORIES } from '../../config';
import { CATEGORY_GLYPH, glyphMarkup } from '../../lib/glyphs';
import type { Category, Report, ReportStatus } from '../../types';

/**
 * Custom Leaflet DivIcons. Building them once per category/status/selection
 * keeps panning and zooming cheap.
 */

const reportIconCache = new Map<string, DivIcon>();
const actionIconCache = new Map<string, DivIcon>();
// Reusing the same icon object also stops Leaflet from rebuilding the cluster
// element (and replaying its entry animation) on every pan.
const clusterIconCache = new Map<string, DivIcon>();

function statusBadge(status: ReportStatus): string {
  if (status === 'resolved') {
    return `<span class="pin__badge pin__badge--resolved">${glyphMarkup('check', 9, 3.2)}</span>`;
  }
  if (status === 'not_suitable') {
    return `<span class="pin__badge pin__badge--muted">${glyphMarkup('cross', 9, 3.2)}</span>`;
  }
  return `<span class="pin__badge pin__badge--${status}"></span>`;
}

export function reportIcon(
  report: Pick<Report, 'category' | 'status'>,
  selected = false,
): DivIcon {
  const key = `${report.category}|${report.status}|${selected ? 1 : 0}`;
  const cached = reportIconCache.get(key);
  if (cached) return cached;

  const category = report.category as Category;
  const icon = L.divIcon({
    className: 'ns-icon',
    html: `<span class="pin pin--${category}${selected ? ' is-selected' : ''}"><span class="pin__glyph">${glyphMarkup(
      CATEGORY_GLYPH[category],
      selected ? 16 : 14,
    )}</span>${statusBadge(report.status)}</span>`,
    iconSize: selected ? [38, 38] : [32, 32],
    iconAnchor: selected ? [19, 19] : [16, 16],
    tooltipAnchor: selected ? [0, -22] : [0, -18],
  });

  reportIconCache.set(key, icon);
  return icon;
}

const draftIconCache = new Map<string, DivIcon>();

/** The author's own report that is not public yet: a hollow, dashed pin. */
export function draftIcon(category: Category, selected = false): DivIcon {
  const key = `${category}|${selected ? 1 : 0}`;
  const cached = draftIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'ns-icon',
    html: `<span class="pin pin--${category} pin--draft${selected ? ' is-selected' : ''}"><span class="pin__glyph">${glyphMarkup(
      CATEGORY_GLYPH[category],
      selected ? 16 : 14,
    )}</span></span>`,
    iconSize: selected ? [38, 38] : [32, 32],
    iconAnchor: selected ? [19, 19] : [16, 16],
    tooltipAnchor: selected ? [0, -22] : [0, -18],
  });

  draftIconCache.set(key, icon);
  return icon;
}

export type CategoryCounts = Partial<Record<Category, number>>;

/** Conic-gradient ring showing each category's share, in legend order. */
function categoryRing(counts: CategoryCounts, total: number): string {
  if (total <= 0) return 'var(--forest)';
  const stops: string[] = [];
  let start = 0;
  for (const category of CATEGORIES) {
    const value = counts[category.id] ?? 0;
    if (value <= 0) continue;
    const end = start + (value / total) * 100;
    stops.push(`var(--cat-${category.id}) ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    start = end;
  }
  return stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--forest)';
}

export function clusterIcon(count: number, counts: CategoryCounts = {}): DivIcon {
  const key = `${count}|${CATEGORIES.map((category) => counts[category.id] ?? 0).join(',')}`;
  const cached = clusterIconCache.get(key);
  if (cached) return cached;

  const size = count < 10 ? 38 : count < 100 ? 44 : 50;
  const icon = L.divIcon({
    className: 'ns-icon',
    html: `<span class="cluster" data-size="${count < 10 ? 'sm' : count < 100 ? 'md' : 'lg'}" style="background: ${categoryRing(counts, count)}"><span class="cluster__count">${count}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -size / 2],
  });

  clusterIconCache.set(key, icon);
  return icon;
}

export function actionIcon(selected = false): DivIcon {
  const key = selected ? 'selected' : 'default';
  const cached = actionIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'ns-icon',
    html: `<span class="action-pin${selected ? ' is-selected' : ''}">${glyphMarkup('action', 16, 2)}</span>`,
    iconSize: selected ? [40, 40] : [34, 34],
    iconAnchor: selected ? [20, 20] : [17, 17],
    tooltipAnchor: [0, -20],
  });

  actionIconCache.set(key, icon);
  return icon;
}

export function tempIcon(): DivIcon {
  return L.divIcon({
    className: 'ns-icon',
    html: `<span class="temp-pin"><span class="temp-pin__ring"></span><span class="temp-pin__glyph">${glyphMarkup(
      'crosshair',
      16,
      2,
    )}</span></span>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    tooltipAnchor: [0, -26],
  });
}

export function userIcon(): DivIcon {
  return L.divIcon({
    className: 'ns-icon',
    html: '<span class="user-dot"><span class="user-dot__pulse"></span></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}
