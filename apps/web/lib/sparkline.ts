import type { Json } from "@qrcdn/shared";

// Pure geometry for the /codes table's per-row sparklines (P9.6-U2). No I/O,
// no JSX — components/codes/sparkline.tsx is the presentational leaf that
// consumes this. Mirrors lib/analytics.ts's own "pure math, no I/O" charter.

/** Fixed viewBox the sparkline SVG renders into — `preserveAspectRatio="none"`
 *  (set by the consuming component) stretches this to whatever box the
 *  table/card places it in, so these numbers only need to keep the geometry
 *  math simple, not match any real pixel size. */
export const SPARKLINE_VIEW_W = 120;
export const SPARKLINE_VIEW_H = 32;
const PAD_Y = 3;
const TOP_Y = PAD_Y;
const BASELINE_Y = SPARKLINE_VIEW_H - PAD_Y;
const MID_Y = SPARKLINE_VIEW_H / 2;

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineGeometry {
  /** `<polyline points="...">` value, `""` for an empty input (nothing to
   *  draw — the caller should treat this the same as "no activity"). */
  points: string;
  /** The final point's coordinates, for an optional "current value" marker
   *  dot — `null` when `points` is empty. */
  lastPoint: SparklinePoint | null;
  /** `true` when at least one value in the window is nonzero. Distinct from
   *  whether the LINE is flat (see `buildSparkline`'s own doc comment): a
   *  code with a real, constant, nonzero count every day is flat AND has
   *  activity; a code with literally zero scans every day is flat and has
   *  none. Consumers use this to pick a muted vs. accent stroke and to
   *  decide whether the "current value" dot means anything. */
  hasActivity: boolean;
}

const EMPTY_GEOMETRY: SparklineGeometry = { points: "", lastPoint: null, hasActivity: false };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Normalizes `values` (one code's daily scan counts, already zero-filled by
 * `scan_sparklines`, P9.6-U1) to a `<polyline>` points string.
 *
 * NORMALIZATION CHOICE, stated once here since the alternative is equally
 * defensible: this scales each sparkline to **its own** min/max, not a
 * scale shared across every row's sparkline. A shared scale would make a
 * quiet code (say, 0-3 scans/day) render as a flat near-invisible line next
 * to a code peaking in the hundreds — technically honest about relative
 * volume, but useless as a per-code trend read, which is the whole point of
 * a per-row sparkline (board reference: Robinhood's per-ticker row charts,
 * which scale each ticker to its own recent range, not to the whole
 * portfolio's range). Own-scale normalization is the standard sparkline
 * convention for exactly this reason (Tufte's original sparkline concept
 * does the same) and is what "so a low-volume code still shows shape" in
 * the spec is asking for.
 *
 * FLAT-LINE CASE: when every value in the window is identical (`min ===
 * max`), there is a zero-width range to normalize against — dividing by
 * `max - min` would divide by zero. This covers two different real
 * situations, deliberately rendered as the SAME flat geometry (a mid-height
 * horizontal line) but distinguished by `hasActivity`:
 *   - Every value is 0 (a genuinely quiet code) — `hasActivity: false`, so
 *     the consumer renders a dim/muted stroke and skips the "latest value"
 *     dot. This is the "must render something honest and flat, not broken
 *     or empty" case the spec calls out by name.
 *   - Every value is the SAME nonzero count (a real but perfectly steady
 *     code) — `hasActivity: true`, normal stroke. Rare, but a flat line at
 *     constant altitude is the honest picture: there is no variation to
 *     show, and pinning it at either the top or the baseline would imply a
 *     min/max relationship to the rest of the series that doesn't exist.
 *
 * Straight-line `<polyline>` segments, not a smoothed curve: at a ~120x32
 * sparkline scale (up to 365 points on the widest range) individual segment
 * curvature isn't perceptible, and a polyline's points string is roughly a
 * third the bytes of the equivalent cubic-Bezier path (one number pair per
 * point vs. two control points + an endpoint per segment) — this renders up
 * to 250 times per page load, so the byte/complexity savings are real, not
 * theoretical. `dashboard-window.tsx`'s `smoothPath` (a monotone
 * cubic-Bezier helper) was considered and deliberately not reused here —
 * it's built for one ~760px marketing chart with 10 points, a different
 * scale/count regime than 250 small server-rendered sparklines.
 */
export function buildSparkline(values: readonly number[]): SparklineGeometry {
  if (values.length === 0) {
    return EMPTY_GEOMETRY;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const hasActivity = max > 0;
  const flat = min === max;

  const step = values.length > 1 ? SPARKLINE_VIEW_W / (values.length - 1) : 0;

  const coords: SparklinePoint[] = values.map((v, i) => {
    const x = values.length > 1 ? i * step : SPARKLINE_VIEW_W / 2;
    const y = flat ? MID_Y : BASELINE_Y - ((v - min) / (max - min)) * (BASELINE_Y - TOP_Y);
    return { x: round2(x), y: round2(y) };
  });

  return {
    points: coords.map((p) => `${p.x},${p.y}`).join(" "),
    lastPoint: coords[coords.length - 1] ?? null,
    hasActivity,
  };
}

/**
 * Defensive `Json` -> `number[]` parse for `scan_sparklines`' `points`
 * column. The RPC's own contract guarantees a dense, all-numeric array
 * (P9.6-U1 migration, `scan_sparklines`'s doc comment), so this should
 * never need to correct anything in practice — but `points` crosses
 * PostgREST as untyped `Json`, and this is display code, not a schema
 * validation boundary (same posture `lib/analytics.ts`'s `sumBuckets`
 * already takes for other jsonb columns). Malformed entries map to `0`
 * rather than being filtered out, preserving array length/position — the
 * zero-fill contract is positional (`points[i]` is day `start_date + i`),
 * so dropping an entry would silently misalign every later day.
 */
export function parseSparklinePoints(json: Json | undefined): number[] {
  if (!Array.isArray(json)) {
    return [];
  }
  return json.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : 0));
}
