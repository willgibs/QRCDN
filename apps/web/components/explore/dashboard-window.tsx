"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ProductWindow } from "./product-window";

// Same demo dataset as dashboard-card.tsx's AreaChart — kept in sync so both
// mockups tell one consistent story ("Summer menu" / K7M2X9A).
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
];

const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Compact analytics product shot — client component only because it embeds
 *  the existing Recharts area chart (recharts requires the DOM). Not wired
 *  into a page yet; a component for later placement. */
export function DashboardWindow() {
  return (
    <ProductWindow url="qrcdn.com/codes/K7M2X9A">
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
        <span className="font-display font-semibold">Summer menu</span>
        <span className="font-mono text-xs text-muted-foreground">/K7M2X9A</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
          Active
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
        <div className="p-5">
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <AreaChart data={scans} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="scansFade2" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#scansFade2)"
                stroke="var(--color-scans)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="flex flex-col justify-center gap-4 border-t border-border/60 p-5 lg:border-t-0 lg:border-l">
          <div>
            <p className="text-xs text-muted-foreground">Total scans</p>
            <p className="font-display text-xl font-semibold">12,482</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Unique</p>
            <p className="font-display text-xl font-semibold">8,904</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Top country</p>
            <p className="font-display text-xl font-semibold">US · 41%</p>
          </div>
        </div>
      </div>
    </ProductWindow>
  );
}
