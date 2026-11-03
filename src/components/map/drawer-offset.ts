/** The bottom sheet's normal height on a phone, as set in responsive.css. */
function sheetHeight(): number {
  const height = window.innerHeight;
  return height * (height <= 640 ? 0.74 : window.innerWidth <= 560 ? 0.68 : 0.64);
}

/**
 * How far an open panel moves the middle of the visible map, in pixels: to the
 * left on a computer (the panel is on the right), up on a phone (bottom sheet).
 * On a phone it is measured, so a short screen keeps the point clear of the
 * search bar above and the sheet below.
 */
export function drawerOffset(): [number, number] {
  const width = window.innerWidth;
  if (width > 900) return [(width > 1150 ? 428 : 384) / 2, 0];
  const map = document.querySelector('.map')?.getBoundingClientRect();
  if (!map) return [0, 220];
  // An open sheet is measured; one that is about to open is taken at its normal height.
  const sheetTop =
    document.querySelector('.drawer')?.getBoundingClientRect().top ??
    window.innerHeight - sheetHeight();
  const bar = document.querySelector('.map-mobile-bar')?.getBoundingClientRect();
  const top = Math.max(map.top, bar?.bottom ?? map.top);
  return [0, map.top + map.height / 2 - (top + Math.min(sheetTop, map.bottom)) / 2];
}
