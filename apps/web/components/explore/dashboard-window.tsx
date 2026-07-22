"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ProductWindow } from "./product-window";
import { EASE_OUT } from "@/components/brand/magic";

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

const stats = [
  { label: "Total scans", value: "12,482" },
  { label: "Unique", value: "8,904" },
  { label: "Top country", value: "US · 41%" },
] as const;

// Same top-codes list as dashboard-card.tsx used to render directly — now
// owned here since DashboardWindow is the single framed product shot for
// the analytics section.
const topCodes = [
  { name: "Summer menu", slug: "K7M2X9A", scans: "4,182" },
  { name: "Poster · Tour", slug: "B3TWQ8N", scans: "2,914" },
  { name: "Packaging insert", slug: "H9RFD2M", scans: "1,506" },
] as const;

/** Compact analytics product shot — client component only because it embeds
 *  the existing Recharts area chart (recharts requires the DOM). */
export function DashboardWindow() {
  const reduced = useReducedMotion();

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
          {stats.map((stat, i) => (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <motion.p
                className="font-display text-xl font-semibold"
                initial={{
                  opacity: 0,
                  transform: reduced ? "translateY(0px)" : "translateY(6px)",
                }}
                whileInView={{ opacity: 1, transform: "translateY(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: i * 0.06 }}
              >
                {stat.value}
              </motion.p>
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border/60 border-t border-border/60">
        {topCodes.map((code) => (
          <div
            key={code.slug}
            className="flex items-center justify-between px-5 py-3"
          >
            <div>
              <span className="block text-sm">{code.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                /{code.slug}
              </span>
            </div>
            <span className="font-mono text-sm">{code.scans}</span>
          </div>
        ))}
      </div>
    </ProductWindow>
  );
}
