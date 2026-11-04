/**
 * True when the reader asked for less motion (Reduce Motion on iOS and macOS,
 * "Remove animations" on Android and Windows). Read on every call, so a
 * change in the settings applies at once (WCAG technique C39/SCR40).
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
