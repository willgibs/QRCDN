"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { Tables } from "@qrcdn/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { RangeSelector } from "@/components/codes/range-selector";
import { formatDate } from "@/lib/date-format";
import {
  axisTicks,
  maxRangeDaysFor,
  peakDayFrom,
  toChartSeries,
  type RangeDays,
} from "@/lib/analytics";
import type { Plan } from "@/lib/entitlements";

/**
 * One row per day, already summed across every one of the caller's codes —
 * `scan_totals_by_day` (P9.6-U1)'s return row is structurally identical to
 * a `scan_daily` row (`day`/`scans`/`uniques`, same types), so this keeps
 * that alias rather than inventing a parallel type. The RPC IS the point of
 * this shape: it replaced a code-id-less raw `scan_daily` select
 * (`app/(app)/codes/page.tsx`, pre-P9.6) that returned one row per
 * (code, day) pair — up to 91,250 rows at Pro scale, silently truncated
 * past PostgREST's 1000-row cap. This component no longer sums anything
 * itself (no more `sumDailyAcrossCodes`): Postgres already did that, and
 * `toChartSeries` (`lib/analytics.ts`) already expects exactly this
 * (day, scans, uniques) shape as its input.
 */
type DailyRow = Pick<Tables<"scan_daily">, "day" | "scans" | "uniques">;

// Scans only — summing per-code daily "uniques" across codes double-counts
// a visitor who scanned two of the caller's codes the same day, on top of
// the existing daily-salt caveat that already makes cross-day uniques
// meaningless (lib/analytics.ts:168-171). The per-code panel
// (code-analytics-panel.tsx) has a real single-code "uniques" series; this
// global overview intentionally does not, and `scan_totals_by_day`'s own
// uniques column is never read below.
const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * `/codes` global scan-activity chart (P6.5-U1, RPC-wired + peak-day-folded
 * at P9.6-U2) — board note: "/codes feels bland vs the analytics page —
 * carry a global version of the stats chart." Same chart/tooltip/gradient
 * treatment as code-analytics-panel.tsx's per-code `CodeAnalyticsPanel`,
 * collapsed across every one of the caller's dynamic codes instead of one.
 * Client component only because Recharts needs the DOM (ChartContainer's
 * ResponsiveContainer) — `dailyRows` is server-fetched in
 * app/(app)/codes/page.tsx via the `scan_totals_by_day` RPC and passed
 * straight in, zero client-side data fetching, same contract
 * `CodeAnalyticsPanel` already uses.
 *
 * P9.6-U2: the "Scans" (range total) and "Active codes" stat tiles that
 * used to sit below this chart moved into the page's own stat strip
 * (app/(app)/codes/page.tsx — the strip needs the range total anyway, for
 * its "Last Nd" cell, and putting all four strip cells in one place beat
 * splitting them across two components). "Peak day" folded into THIS card
 * as a caption instead of staying a separate tile below it — the spec's
 * framing: today's page showed three scan numbers in three separate
 * places, and the pair under the chart read as an afterthought.
 */
export function CodesOverviewPanel({
  plan,
  range,
  dailyRows,
}: {
  plan: Plan;
  range: RangeDays;
  dailyRows: DailyRow[];
}) {
  const maxDays = maxRangeDaysFor(plan);
  const series = toChartSeries(dailyRows, range);
  const rangeTotal = dailyRows.reduce((sum, row) => sum + row.scans, 0);
  // peakDayFrom (lib/analytics.ts) — a naive `series.reduce(..., series[0])`
  // needs a seed, and series[0] is the only element guaranteed to exist —
  // but when every point is 0 scans, nothing ever beats that seed, so the
  // reduce would silently "peak" on the range's first day even though it
  // had no scans at all. See that function's own doc comment.
  const peakDay = peakDayFrom(series);
  const hasScans = rangeTotal > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Scan activity</h2>
        <RangeSelector current={range} maxDays={maxDays} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          {hasScans && (
            // Folded in from a separate "Peak day" tile (pre-P9.6-U2) — the
            // range TOTAL already has its own cell in the page's stat strip
            // above, so this caption states only what's new here: which day
            // peaked, and by how much.
            <p className="text-xs text-muted-foreground">
              Peak{" "}
              <span className="font-medium tabular-nums text-foreground">
                {peakDay.scans.toLocaleString()}
              </span>{" "}
              scans on {formatDate(peakDay.day!)}
            </p>
          )}
          {hasScans ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={series} margin={{ left: 4, right: 4 }}>
                <defs>
                  <linearGradient id="overviewScansFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-scans)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-scans)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  ticks={axisTicks(series)}
                  tickFormatter={formatDate}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(label) => formatDate(String(label))} />}
                />
                <Area
                  dataKey="scans"
                  type="monotone"
                  fill="url(#overviewScansFade)"
                  stroke="var(--color-scans)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No scans in this range yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
