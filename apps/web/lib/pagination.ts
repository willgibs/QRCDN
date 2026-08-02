// Pure pagination math for the /codes table (P9.6-U2 follow-up). No I/O —
// same "pure math, no I/O" charter as lib/analytics.ts, and deliberately
// separate from that module: this isn't analytics, it's a generic
// list-pagination concern that happens to be used once, here.
//
// Why pagination exists at all: at Pro's 250-code ceiling, one document
// carrying every row (even after fixing the byte-size defects that made a
// single page of many rows far heavier than it should be — see
// components/codes/codes-table.tsx's own doc comment) is still not a
// reasonable target. 250 rows in one DOM is a UX problem independent of
// bytes, so this exists regardless of how cheap a single row gets.

/** Rows per /codes page. 25 keeps a page comfortably scannable; at Pro's
 *  250-code ceiling that's 10 pages worst case. */
export const CODES_PAGE_SIZE = 25;

export function totalPagesFor(totalItems: number): number {
  return Math.max(1, Math.ceil(totalItems / CODES_PAGE_SIZE));
}

/**
 * Resolves the `?page=` query param into a safe, in-range page number —
 * same defense-in-depth stance as lib/analytics.ts's resolveRangeDays:
 * malformed, missing, zero/negative, or past-the-end input clamps to
 * something valid (1, or the last real page) rather than producing an
 * empty or errored render. `totalItems` is the caller's unpaginated count.
 */
export function resolveCodesPage(param: string | undefined, totalItems: number): number {
  const totalPages = totalPagesFor(totalItems);
  if (param === undefined || !/^\d+$/.test(param)) {
    return 1;
  }
  const parsed = Number(param);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, totalPages);
}

/** `[start, end)` slice indices for `page` (1-indexed) — feed straight into
 *  `Array.prototype.slice`. */
export function pageSliceFor(page: number): { start: number; end: number } {
  const start = (page - 1) * CODES_PAGE_SIZE;
  return { start, end: start + CODES_PAGE_SIZE };
}
