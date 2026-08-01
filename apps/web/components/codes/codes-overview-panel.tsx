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
import { RangeSelector, rangeLabel } from "@/components/codes/range-selector";
import {
  maxRangeDaysFor,
  peakDayFrom,
  sumDailyAcrossCodes,
  toChartSeries,
  type RangeDays,
} from "@/lib/analytics";
import type { Plan } from "@/lib/entitlements";

type DailyRow = Pick<Tables<"scan_daily">, "day" | "scans" | "uniques">;

// Scans only — sumDailyAcrossCodes's own doc comment explains why: summing
// per-code daily "uniques" across codes double-counts a visitor who scanned
// two of the caller's codes the same day, on top of the existing
// daily-salt caveat that already makes cross-day uniques meaningless. The
// per-code panel (code-analytics-panel.tsx) has a real single-code
// "uniques" series; this global overview intentionally does not.
const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
} satisfies ChartConfig;

function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        {caption && <p className="font-mono text-[11px] text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * `/codes` global scan-activity chart (P6.5-U1) — board note: "/codes feels
 * bland vs the analytics page — carry a global version of the stats chart."
 * Same chart/tooltip/gradient treatment as code-analytics-panel.tsx's
 * per-code `CodeAnalyticsPanel`, collapsed across every one of the caller's
 * dynamic codes instead of one. Client component only because Recharts
 * needs the DOM (ChartContainer's ResponsiveContainer) — `dailyRows` is
 * server-fetched in app/(app)/codes/page.tsx (a code-id-less `scan_daily`
 * query, RLS-scoped) and passed straight in, zero client-side data
 * fetching, same contract `CodeAnalyticsPanel` already uses.
 *
 * Deliberately plain `StatTile`s, no `PoppingStat`/motion (spec: chart
 * prominence is the ask here, not a new motion surface) and deliberately no
 * "Today so far" tile — that already exists in codes/page.tsx's own
 * page-level stat-tile row (sourced live from scan_events, not scan_daily),
 * duplicating it here would just repeat the same number twice on one page.
 * The chart's gradient id (`overviewScansFade`) is intentionally distinct
 * from `CodeAnalyticsPanel`'s `scansFade`/`uniquesFade` to avoid a DOM id
 * collision if both ever render in the same document.
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
  const daily = sumDailyAcrossCodes(dailyRows);
  const series = toChartSeries(daily, range);
  const rangeTotal = daily.reduce((sum, row) => sum + row.scans, 0);
  // peakDayFrom (lib/analytics.ts) — real found bug (P9.5-T7 review round
  // 1, identical pattern fixed in code-analytics-panel.tsx too): a naive
  // `series.reduce(..., series[0])` silently "peaks" on the range's first
  // day when every day has 0 scans, so this tile used to render a
  // fabricated date as "Peak day" for any account with no scans in range.
  // See that function's own doc comment for the full reasoning.
  const peakDay = peakDayFrom(series);
  const hasScans = rangeTotal > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Scan activity</h2>
        <RangeSelector current={range} maxDays={maxDays} />
      </div>

      <Card>
        <CardContent>
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
                  interval="preserveStartEnd"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Scans"
          value={rangeTotal.toLocaleString()}
          caption={`last ${rangeLabel(range)}`}
        />
        <StatTile
          label="Peak day"
          value={peakDay.scans.toLocaleString()}
          caption={peakDay.day ?? undefined}
        />
      </div>
    </div>
  );
}
