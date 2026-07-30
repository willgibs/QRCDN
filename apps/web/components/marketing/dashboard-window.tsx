"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProductWindow } from "./product-window";

// Analytics product shot, refreshed to the real /codes chart shapes (P9-U2)
// — study components/codes/codes-overview-panel.tsx: identical AreaChart/
// gradient/tooltip config, and the same Card-based StatTile pattern (label /
// large tabular-nums value / mono caption) rather than the P2-era ad hoc
// motion-popping <p> stats and a fabricated "top codes" list that doesn't
// exist on the real overview panel. Client component only because Recharts
// needs the DOM (ChartContainer's ResponsiveContainer).
const scans = [
  { day: "Jun 22", scans: 214 },
  { day: "Jun 25", scans: 310 },
  { day: "Jun 28", scans: 289 },
  { day: "Jul 1", scans: 405 },
  { day: "Jul 4", scans: 612 },
  { day: "Jul 7", scans: 528 },
  { day: "Jul 10", scans: 719 },
  { day: "Jul 13", scans: 833 },
  { day: "Jul 16", scans: 780 },
  { day: "Jul 19", scans: 941 },
] as const;

const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Static — mirrors RangeSelector's real labels (lib/analytics.ts's
// rangeLabel: 365 → "1y", else "{days}d") as a decorative, non-interactive
// pill row; the real control lives on the app-only /codes page.
const RANGE_PILLS = ["7d", "30d", "90d", "1y"] as const;
const ACTIVE_RANGE = "30d";

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

export function DashboardWindow() {
  const total = scans.reduce((sum, point) => sum + point.scans, 0);
  const peak = scans.reduce((max, point) => (point.scans > max.scans ? point : max), scans[0]);

  return (
    <ProductWindow url="qrcdn.com/codes">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4">
        <span className="font-display font-semibold">Scan activity</span>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 p-1">
          {RANGE_PILLS.map((range) => (
            <span
              key={range}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[11px]",
                range === ACTIVE_RANGE
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground/50",
              )}
            >
              {range}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={[...scans]} margin={{ left: 4, right: 4 }}>
            <defs>
              <linearGradient id="marketingScansFade" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#marketingScansFade)"
              stroke="var(--color-scans)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <StatTile label="Scans" value={total.toLocaleString()} caption={`last ${ACTIVE_RANGE}`} />
          <StatTile label="Peak day" value={peak.scans.toLocaleString()} caption={peak.day} />
        </div>
      </div>
    </ProductWindow>
  );
}
