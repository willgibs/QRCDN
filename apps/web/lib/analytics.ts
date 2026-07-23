import type { Tables } from "@qrcdn/shared";
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
