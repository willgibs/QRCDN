import type { Json, Tables } from "@qrcdn/shared";
import { PLAN_LIMITS, type Plan } from "./entitlements";

// Pure analytics math — no I/O, no Supabase import. Consumers (dashboard
// server components/actions) own the actual `scan_daily` query; this module
// only decides *which* window to query and reshapes the rows it gets back.
// See apps/web/lib/analytics.test.ts for the full behavior matrix.

/** The only chart-range presets the UI offers. Longer presets are simply
 *  unreachable when they exceed the caller's plan ceiling (see
 *  `resolveRangeDays`). */
export const RANGE_OPTIONS = [7, 30, 90, 365] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

/**
 * The short display form for a range ("30d", "1y" for the 365 case) — moved
 * here at P9.6-U2 from `components/codes/range-selector.tsx` (a "use
 * client" module) after `app/(app)/codes/page.tsx` needed to call it from a
 * Server Component: any export of a "use client" file becomes a client
 * reference to server code, even a plain, side-effect-free function, and
 * Next.js throws at request time (not at build/typecheck — a force-dynamic
 * route is never actually rendered during `next build`, so this only
 * surfaced in e2e) rather than statically. `range-selector.tsx` re-exports
 * this rather than keeping its own copy, so its existing importers
 * (`code-analytics-panel.tsx`) don't need to change.
 */
export function rangeLabel(days: number): string {
  return days === 365 ? "1y" : `${days}d`;
}

const DEFAULT_RANGE_DAYS: RangeDays = 30;

/**
 * Deliberately reuses `PLAN_LIMITS[plan].analyticsRetentionDays` as the
 * chart-range ceiling — you can't chart past what's retained (D8), so there
 * is no reason to invent a second "max chart range" constant. Entitlement
 * values live in `apps/web/lib/entitlements.ts` only (hard rule).
 */
export function maxRangeDaysFor(plan: Plan): number {
  return PLAN_LIMITS[plan].analyticsRetentionDays;
}

/** The largest `RANGE_OPTIONS` value that still fits under `ceiling`. Falls
 *  back to the smallest option if even that doesn't fit (defensive — every
 *  current plan's ceiling is >= 30). */
function largestOptionUnder(ceiling: number): RangeDays {
  for (let i = RANGE_OPTIONS.length - 1; i >= 0; i--) {
    const option = RANGE_OPTIONS[i]!;
    if (option <= ceiling) {
      return option;
    }
  }
  return RANGE_OPTIONS[0];
}

/** Strict integer parse of the raw `?range=` value against the fixed preset
 *  list — `null` for anything malformed or not one of `RANGE_OPTIONS`
 *  (decimals, empty string, non-numeric, negative, or simply a disallowed
 *  day count like "45"). */
function parsePresetParam(param: string | undefined): RangeDays | null {
  if (param === undefined || !/^\d+$/.test(param)) {
    return null;
  }
  const parsed = Number(param);
  return (RANGE_OPTIONS as readonly number[]).includes(parsed) ? (parsed as RangeDays) : null;
}

/**
 * Resolves the `?range=` query param a client controls into a safe day
 * count. This is the actual security boundary — the UI hiding options the
 * plan can't reach is cosmetic only; a free-plan user can hand-craft
 * `?range=365` and must still get clamped server-side.
 *
 * Malformed/missing/disallowed input defaults to 30 days, itself clamped to
 * the plan ceiling (relevant only for a hypothetical future plan with a
 * sub-30-day retention window).
 */
export function resolveRangeDays(param: string | undefined, plan: Plan): RangeDays {
  const ceiling = maxRangeDaysFor(plan);
  const requested = parsePresetParam(param) ?? DEFAULT_RANGE_DAYS;
  return requested <= ceiling ? requested : largestOptionUnder(ceiling);
}

function toDateOnlyIso(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/**
 * `[start, end)` window in UTC, as date-only ISO strings (`scan_daily.day`
 * is a `date` column — string comparison against `YYYY-MM-DD` is exact).
 * `end` is today's UTC midnight, exclusive: today's partial day never comes
 * from the `scan_daily` rollup (it lags up to an hour behind, per the
 * pg_cron job) — the live layer is responsible for "today" if a caller ever
 * needs it. `now` is injectable so tests don't depend on wall-clock time.
 */
export function rangeWindowUtc(
  days: number,
  now: Date = new Date(),
): { startIso: string; endIso: string } {
  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startMs = endMs - days * DAY_MS;
  return { startIso: toDateOnlyIso(startMs), endIso: toDateOnlyIso(endMs) };
}

export interface ChartPoint {
  day: string;
  scans: number;
  uniques: number;
}

/**
 * Zero-fills every day in `[start, end)` (length exactly `days`, ascending),
 * so a sparse `scan_daily` result (rows only exist for days that had scans)
 * still renders a continuous chart. `rows` need not be sorted or complete —
 * lookup is by exact `day` string match.
 */
export function toChartSeries(
  rows: Pick<Tables<"scan_daily">, "day" | "scans" | "uniques">[],
  days: number,
  now: Date = new Date(),
): ChartPoint[] {
  const { startIso } = rangeWindowUtc(days, now);
  const startMs = Date.parse(`${startIso}T00:00:00.000Z`);

  const byDay = new Map(rows.map((row) => [row.day, row]));

  const series: ChartPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = toDateOnlyIso(startMs + i * DAY_MS);
    const row = byDay.get(day);
    series.push({ day, scans: row?.scans ?? 0, uniques: row?.uniques ?? 0 });
  }
  return series;
}

/**
 * `count` evenly-spaced `day` values out of `series`, for `<XAxis ticks={...}>`
 * (P9.6-U2) — a "handful of labels, not fifteen" regardless of the
 * selected range (7/30/90/365 points). Recharts' own `interval="preserveStartEnd"`
 * auto-thins based on rendered label width, which back-fires once axis
 * labels get SHORTER (this unit's own date-format fix): shorter text lets
 * more ticks fit, the opposite of "sparser." Explicit `ticks` sidesteps
 * that entirely.
 *
 * Always includes the first and last day (`series[0]`/`series[at-1]`) and
 * fills the rest as close to evenly-spaced as integer indices allow;
 * de-duplicated so a `series` shorter than `count` degrades to "every day"
 * rather than repeating a label.
 */
export function axisTicks(series: ChartPoint[], count = 5): string[] {
  if (series.length <= count) {
    return series.map((point) => point.day);
  }
  const ticks: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (series.length - 1));
    ticks.push(series[idx]!.day);
  }
  return Array.from(new Set(ticks));
}

export interface PeakDay {
  scans: number;
  /** `null` when no day in `series` has any scans — see this function's
   *  own doc comment for why that case can't just return `series[0]`. */
  day: string | null;
}

/**
 * The single highest-scan day in a `toChartSeries` result (P9.5-T7 review
 * round 1 — extracted from two near-identical copies in
 * `codes-overview-panel.tsx`/`code-analytics-panel.tsx` into one tested
 * function after the same real bug was found in both: a plain
 * `series.reduce((peak, point) => ..., series[0])` needs a seed, and
 * `series[0]` is the only element guaranteed to exist — but when every
 * point is 0 scans, nothing ever beats that seed, so the reduce silently
 * "peaks" on the range's first day even though it had no scans at all.
 * The caller then rendered that day's date as "Peak day," a fabricated
 * fact presented as a measurement for any code/account with zero scans in
 * range. This function returns `day: null` for that case instead of a
 * date that means nothing; `scans` stays 0 either way, since "0 peak
 * scans" is true and honest, unlike the date. Callers pass `day` straight
 * into a stat tile's optional `caption` prop, which already renders
 * nothing for a falsy value.
 */
export function peakDayFrom(series: ChartPoint[]): PeakDay {
  const peak = series.reduce((peak, point) => (point.scans > peak.scans ? point : peak), series[0]);
  if (!peak || peak.scans === 0) {
    return { scans: 0, day: null };
  }
  return { scans: peak.scans, day: peak.day };
}

/**
 * Collapses N rows-per-day (one per code, from a code_id-less `scan_daily`
 * query — see app/(app)/codes/page.tsx, which queries the whole owner scope
 * instead of a single code) into one row per day, summing `scans`/`uniques`
 * across every code that had activity that day. Output is sorted ascending
 * by `day`, matching `toChartSeries`'s own row shape, so it composes
 * directly: `toChartSeries(sumDailyAcrossCodes(rows), range)`.
 *
 * This still sums `uniques` for future callers, but the `/codes` overview
 * UI must NOT chart `uniques`: `scan_daily.uniques` is already a per-code
 * approximation salted by a daily-rotating IP hash (see
 * code-analytics-panel.tsx's "Unique (per day)" comment — only a single
 * day's value means anything, cross-day comparisons don't). Summing that
 * per-code approximation ACROSS codes compounds the problem further — a
 * visitor who scans two of the caller's codes on the same day gets counted
 * twice, so a cross-code "uniques" total isn't just noisy, it's actively
 * wrong in a way `scans` (a plain count, no salt involved) is not.
 *
 * Perf/correctness note: a code-id-less `scan_daily` query returns one row
 * per (code, day) pair, not one row per day — at Pro scale that's up to
 * 250 codes × 365 days = 91,250 rows for a full-year window, which exceeds
 * PostgREST's default `max_rows` (1000) and gets truncated SILENTLY (no
 * error, just a short result), producing an undercounted chart with no
 * indication anything was dropped. Fine at current scale; revisit at P8 by
 * moving the per-day sum into a security-definer RPC (so Postgres, not
 * PostgREST, returns one row per day) or paginating the query.
 */
export function sumDailyAcrossCodes(
  rows: Pick<Tables<"scan_daily">, "day" | "scans" | "uniques">[],
): Pick<Tables<"scan_daily">, "day" | "scans" | "uniques">[] {
  const totals = new Map<string, { scans: number; uniques: number }>();

  for (const row of rows) {
    const existing = totals.get(row.day);
    if (existing) {
      existing.scans += row.scans;
      existing.uniques += row.uniques;
    } else {
      totals.set(row.day, { scans: row.scans, uniques: row.uniques });
    }
  }

  return Array.from(totals, ([day, { scans, uniques }]) => ({ day, scans, uniques })).sort(
    (a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0),
  );
}

export interface BucketCount {
  key: string;
  count: number;
}

const OTHER_LABEL = "Other";

/**
 * Sums `{ [key: string]: number }`-shaped `Json` buckets — scan_daily's
 * by_country/by_device/by_referer/by_city columns, one bucket per fetched
 * day — into totals across the whole range, then collapses to the top
 * `top` entries by count (descending). Everything else — both the tail
 * beyond `top` AND any pre-existing "other" key each day's own rollup may
 * already carry (Postgres's `_cap_top_n_jsonb`, a 50-key-per-day cap —
 * supabase/migrations/20260723000007_scan_rollup.sql — emits a lowercase
 * "other" bucket for anything past its own top 50) — folds into one final
 * "Other" entry, matched case-insensitively so it's never double-counted
 * or double-listed. Malformed entries (a non-object bucket, a non-numeric
 * value) are skipped rather than thrown on: this is display aggregation
 * for the dashboard, not a schema validation boundary. Empty input, or
 * input with no numeric values at all, returns `[]`.
 */
export function sumBuckets(buckets: Json[], top = 5): BucketCount[] {
  const totals = new Map<string, number>();

  for (const bucket of buckets) {
    if (typeof bucket !== "object" || bucket === null || Array.isArray(bucket)) {
      continue;
    }
    for (const [key, value] of Object.entries(bucket)) {
      if (typeof value !== "number") continue;
      totals.set(key, (totals.get(key) ?? 0) + value);
    }
  }

  let otherTotal = 0;
  const named: BucketCount[] = [];
  for (const [key, count] of totals) {
    if (key.toLowerCase() === "other") {
      otherTotal += count;
    } else {
      named.push({ key, count });
    }
  }

  named.sort((a, b) => b.count - a.count);

  const head = named.slice(0, top);
  otherTotal += named.slice(top).reduce((sum, entry) => sum + entry.count, 0);

  if (otherTotal > 0) {
    head.push({ key: OTHER_LABEL, count: otherTotal });
  }

  return head;
}
