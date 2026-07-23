"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { Json, Tables } from "@qrcdn/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { EASE_OUT } from "@/components/brand/magic";
import { RangeSelector, rangeLabel } from "@/components/codes/range-selector";
import { useMounted } from "@/hooks/use-mounted";
import { maxRangeDaysFor, sumBuckets, toChartSeries, type RangeDays } from "@/lib/analytics";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";

type DailyRow = Pick<
  Tables<"scan_daily">,
  "day" | "scans" | "uniques" | "by_country" | "by_device" | "by_referer" | "by_city"
>;
type RecentEvent = Pick<
  Tables<"scan_events">,
  "ts" | "country" | "region" | "city" | "device" | "referer"
>;

// Series colors from the Layer 1 --chart-1/2 tokens (design-system.md
// "Chart approach"). "Unique (per day)" — not "Unique visitors" — because
// the daily-rotating IP-hash salt (P6-U1) makes cross-day unique counts
// meaningless; only a single day's uniques value means anything. The range
// TOTAL stat tile below says "Scans", never "unique visitors", for the
// same reason.
const chartConfig = {
  scans: { label: "Scans", color: "var(--chart-1)" },
  uniques: { label: "Unique (per day)", color: "var(--chart-2)" },
} satisfies ChartConfig;

// scan_rollup.sql's window_events CTE coalesces missing dimensions to fixed
// sentinels ("unknown" for country/device/city, "direct" for referer)
// before tallying — render those as sentence case rather than raw
// lowercase. sumBuckets's own "Other" (capitalized) passes through as-is.
function prettyKey(key: string): string {
  if (key.toLowerCase() === "other") return "Other";
  if (key === "direct") return "Direct";
  if (key === "unknown") return "Unknown";
  return key;
}

function relativeTime(iso: string, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}d ago`;
}

function refererHost(referer: string): string {
  try {
    return new URL(referer).hostname;
  } catch {
    return referer;
  }
}

function locationLabel(
  event: Pick<RecentEvent, "country" | "region" | "city">,
  cityGeo: boolean,
): string {
  const parts = [event.country, event.region, ...(cityGeo ? [event.city] : [])];
  const filtered = parts.filter((p): p is string => Boolean(p));
  return filtered.length > 0 ? filtered.join(" · ") : "Unknown location";
}

/**
 * A stat value that pops in ONLY when it changes after this panel's first
 * paint — never on initial mount (design-system.md hard rule: "work
 * surfaces render settled"; do NOT port dashboard-window.tsx's
 * whileInView entrances here). `useMounted()` (hooks/use-mounted.ts,
 * `useSyncExternalStore`-backed) is the gate rather than a plain
 * `useRef`/`useEffect` flag: reading a ref's `.current` during render trips
 * the `react-hooks/refs` lint rule, and setting state from an effect trips
 * `react-hooks/set-state-in-effect` (design-system.md's own "useMounted
 * hook pattern" note documents exactly this tradeoff for the SSR-vs-CSR
 * case; the same fix applies here even though this isn't a theme read).
 * `useMounted()` returns `false` for the very first render (server render +
 * the hydration pass), so `initial` resolves to `false` — no animation. The
 * range selector below drives navigation via plain `<Link>`s to `?range=N`
 * on the SAME route segment, which Next.js resolves as a soft navigation:
 * this client component instance stays mounted and simply receives new
 * props, so a later value change re-keys this span (a fresh mount of just
 * that span) at a point where `useMounted()` is already `true` — that's the
 * one case that pops in.
 *
 * Reduced motion keeps the opacity fade and drops only the movement
 * (`translateY(4px)` collapses to `translateY(0px)`) — "gentler, not zero"
 * (emil-design-eng skill / review-animations standard 8), the same
 * opacity-stays/movement-drops split `useRevealVariants` already uses in
 * components/brand/magic.tsx.
 */
function PoppingStat({ value }: { value: string }) {
  const mounted = useMounted();
  const reduced = useReducedMotion();

  return (
    <motion.span
      key={value}
      className="font-display text-2xl font-semibold tabular-nums text-foreground"
      initial={
        mounted
          ? { opacity: 0, transform: reduced ? "translateY(0px)" : "translateY(4px)" }
          : false
      }
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      {value}
    </motion.span>
  );
}

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
        <PoppingStat value={value} />
        {caption && <p className="font-mono text-[11px] text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, buckets }: { title: string; buckets: Json[] }) {
  const entries = sumBuckets(buckets);
  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{prettyKey(entry.key)}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {entry.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentActivity({ events, cityGeo }: { events: RecentEvent[]; cityGeo: boolean }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scans yet — activity shows up here the moment someone scans this code.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {events.map((event, i) => (
        <li
          key={`${event.ts}-${i}`}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-foreground">{locationLabel(event, cityGeo)}</span>
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="text-muted-foreground">{event.device ?? "Unknown device"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {event.referer ? refererHost(event.referer) : "Direct"}
            </span>
            {/* Relative time is computed independently on the server render
             *  and the client hydration pass — they can differ by the
             *  network round-trip (a second or two), which would otherwise
             *  trip a hydration-mismatch warning for a purely cosmetic
             *  difference. suppressHydrationWarning is the React-documented
             *  escape hatch for exactly this "renders a timestamp" case. */}
            <span
              suppressHydrationWarning
              className="font-mono text-xs text-muted-foreground/70"
            >
              {relativeTime(event.ts)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * P6-U3 per-code analytics surface. Client component only because Recharts
 * needs the DOM (ChartContainer's ResponsiveContainer) — every prop here is
 * server-fetched in app/(app)/codes/[slug]/page.tsx and passed straight in;
 * zero client-side data fetching (spec).
 */
export function CodeAnalyticsPanel({
  plan,
  range,
  dailyRows,
  scansToday,
  recentEvents,
}: {
  plan: Plan;
  range: RangeDays;
  dailyRows: DailyRow[];
  scansToday: number;
  recentEvents: RecentEvent[];
}) {
  const cityGeo = PLAN_LIMITS[plan].cityGeo;
  const maxDays = maxRangeDaysFor(plan);
  const series = toChartSeries(dailyRows, range);
  const rangeTotal = dailyRows.reduce((sum, row) => sum + row.scans, 0);
  const peakDay = series.reduce((peak, point) => (point.scans > peak.scans ? point : peak), series[0]);
  const hasScans = rangeTotal > 0;

  const countries = dailyRows.map((row) => row.by_country);
  const devices = dailyRows.map((row) => row.by_device);
  const referrers = dailyRows.map((row) => row.by_referer);
  const cities = dailyRows.map((row) => row.by_city);

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
                  <linearGradient id="scansFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-scans)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-scans)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uniquesFade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-uniques)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--color-uniques)" stopOpacity={0} />
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
                  fill="url(#scansFade)"
                  stroke="var(--color-scans)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="uniques"
                  type="monotone"
                  fill="url(#uniquesFade)"
                  stroke="var(--color-uniques)"
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Scans"
          value={rangeTotal.toLocaleString()}
          caption={`last ${rangeLabel(range)}`}
        />
        <StatTile label="Peak day" value={peakDay.scans.toLocaleString()} caption={peakDay.day} />
        <StatTile label="Today so far" value={scansToday.toLocaleString()} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Breakdown title="Top countries" buckets={countries} />
        <Breakdown title="Devices" buckets={devices} />
        <Breakdown title="Top sources" buckets={referrers} />
        {cityGeo && <Breakdown title="Top cities" buckets={cities} />}
      </div>

      <div>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Recent activity
        </h3>
        <Card>
          <CardContent>
            <RecentActivity events={recentEvents} cityGeo={cityGeo} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
