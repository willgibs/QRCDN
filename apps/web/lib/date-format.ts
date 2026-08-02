const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * The one date format for every /codes surface (P9.6-U2). Before this unit
 * the page rendered three different shapes for a date: the chart axis's raw
 * "2026-07-03" (scan_daily.day, unformatted), the peak-day caption's same
 * raw string, and the table's Created column via `toLocaleDateString()`
 * ("8/2/2026"). This replaces all of them.
 *
 * Accepts either a date-only string ("YYYY-MM-DD", the shape every
 * `ChartPoint`/RPC row's `day` field is) or a full ISO timestamp
 * (`qr_codes.created_at`) — a bare date-only ISO 8601 string is spec'd to
 * parse as UTC midnight (ECMA-262 Date Time String Format), so `new
 * Date(iso)` handles both shapes correctly with no branching. Read via UTC
 * getters rather than `toLocaleDateString()`: this keeps the result
 * independent of both the server runtime's default locale (not guaranteed
 * consistent across environments/deploys — Node's `Intl` default isn't
 * pinned anywhere in this codebase) and its local timezone (a date-only
 * value read via local getters can roll to the adjacent day depending on
 * the server's TZ offset; UTC getters can't).
 *
 * NOTE on why this does NOT use `suppressHydrationWarning` anywhere it's
 * consumed: the spec that commissioned this unit described the table's old
 * `toLocaleDateString()` call as having "a latent hydration mismatch." That
 * doesn't hold up — `components/codes/codes-table.tsx` has no "use client"
 * directive and its only client descendant is the unrelated
 * `PauseToggleButton` leaf, so that date text is server-rendered once and
 * never re-executed in the browser; there is no second render to disagree
 * with the first. (Contrast `code-analytics-panel.tsx`'s `relativeTime()`,
 * which genuinely needs `suppressHydrationWarning` — that whole file is
 * "use client", so its date math really does run once during SSR and again
 * at hydration.) The real, fixed defect here is non-deterministic
 * formatting and three inconsistent shapes, not a hydration mismatch —
 * flagged in this unit's report rather than silently building on the
 * inaccurate premise.
 *
 * Format is "Mon D" with no year: every date this page renders is either
 * inside the analytics retention ceiling (365 days,
 * `PLAN_LIMITS.pro.analyticsRetentionDays`) or a code's own `created_at`,
 * which — for a product still in its first months — never predates this
 * year either. A future account spanning multiple years would read two
 * Augusts as identical; accepted for now, worth an explicit year suffix if
 * that ever becomes ambiguous in practice.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${MONTH_ABBR[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
