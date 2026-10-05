/**
 * Why: the windowing maths every big-data component scrolls with (virtual
 * list, data tree, data grid): which rows exist at a scroll position, where
 * the recycled pool sits, how tall the sizer may be. One copy in core, so the
 * three components scroll identically and stay small.
 *
 * Browsers clamp how tall an element may be - Chrome around 33.5M px, Firefox
 * lower. Ten million 40px rows would need 400M px of sizer, and the end of the
 * list would simply be unreachable. Past MAX_SIZER_PX the sizer is capped and
 * scroll positions are mapped onto the real range: the last row stays
 * reachable, the only cost is scrollbar granularity nobody can perceive.
 */
export const MAX_SIZER_PX = 15_000_000;

/** Rows kept above and below the viewport so a fast flick never shows a gap. */
export const OVERSCAN = 4;

export interface VirtualWindow {
  /** index of the first row in the pool */
  first: number;
  /** rows in the pool (never more than there are) */
  count: number;
  /** translate of the pool inside the sizer, px */
  shift: number;
}

/** The sizer's height for `total` rows - capped so the browser renders it. */
export function sizerHeight(total: number, rowHeight: number): number {
  return Math.min(total * rowHeight, MAX_SIZER_PX);
}

/** scrollTop (capped space) → offset into the full content (real space). */
function realOffset(scrollTop: number, viewport: number, total: number, rowHeight: number): number {
  const real = total * rowHeight - viewport;
  const capped = sizerHeight(total, rowHeight) - viewport;
  if (real <= 0 || capped <= 0) return 0;
  return (scrollTop / capped) * real;
}

/** The rows that belong in the pool at this scroll position. */
export function virtualWindow(scrollTop: number, viewport: number, rowHeight: number, total: number, overscan = OVERSCAN): VirtualWindow {
  const visible = Math.ceil(viewport / rowHeight) + overscan * 2;
  const offset = realOffset(scrollTop, viewport, total, rowHeight);
  let first = Math.max(0, Math.floor(offset / rowHeight) - overscan);
  if (first + visible > total) first = Math.max(0, total - visible);
  return { first, count: Math.min(visible, total), shift: first * rowHeight - (offset - scrollTop) };
}

/** The scrollTop that shows row `index` at the top (capped space). */
export function scrollTopFor(index: number, viewport: number, rowHeight: number, total: number): number {
  const real = Math.max(0, Math.min(total - 1, index)) * rowHeight;
  const span = total * rowHeight - viewport;
  return span > 0 ? real * ((sizerHeight(total, rowHeight) - viewport) / span) : 0;
}

/** The scrollTop that brings row `index` into view, moving as little as possible. */
export function scrollIntoViewTop(index: number, scrollTop: number, viewport: number, rowHeight: number, total: number): number {
  const top = scrollTopFor(index, viewport, rowHeight, total);
  const shown = realOffset(scrollTop, viewport, total, rowHeight);
  const row = index * rowHeight;
  if (row >= shown && row + rowHeight <= shown + viewport) return scrollTop; // already visible
  if (row < shown) return top;
  return scrollTopFor(index - Math.max(0, Math.floor(viewport / rowHeight) - 1), viewport, rowHeight, total);
}
