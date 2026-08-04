"use client";

import { motion, useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { Json, Tables } from "@qrcdn/shared";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { EASE_OUT } from "@/components/brand/magic";
import { RangeSelector, rangeLabel } from "@/components/codes/range-selector";
import { StatTile } from "@/components/codes/stat-tile";
import { useMounted } from "@/hooks/use-mounted";
import { formatDate } from "@/lib/date-format";
import {
  axisTicks,
  maxRangeDaysFor,
  peakDayFrom,
  sumBuckets,
  toChartSeries,
  type RangeDays,
} from "@/lib/analytics";
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
 * opacity-stays/movement-drops split this codebase's motion entrances use
 * under reduced motion.
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

/**
 * Card-wrapped `StatTile` whose value pops in on change (P9.6-U2: the
 * shared `components/codes/stat-tile.tsx` shell replaced this file's own
 * near-identical `StatTile` — same consolidation as codes/page.tsx and
 * codes-overview-panel.tsx). The shared shell renders a plain string value
 * with its own default styling; this file passes `<PoppingStat>` instead so
 * every call site below keeps its existing pop-in behavior byte-for-byte.
 */
function AnimatedStatTile({
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
      <CardContent>
        <StatTile label={label} value={<PoppingStat value={value} />} caption={caption} />
      </CardContent>
    </Card>
  );
}

/**
 * One breakdown row, WITH a proportion bar (P9.6-U3) — previously bare
 * label+count text, while our own marketing mock of this exact dashboard
 * (components/marketing/dashboard-window.tsx's BreakdownRow) already showed
 * bars. Same recipe ported over: width proportional to that column's OWN
 * max value (`sumBuckets` already returns entries sorted descending, so
 * `entries[0].count` IS that max — no separate Math.max pass needed), one
 * accent color regardless of rank (D13 single-accent rule, same stance
 * sparkline.tsx already takes).
 */
function BreakdownRow({ label, count, maxCount }: { label: string; count: number; maxCount: number }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 truncate text-foreground sm:w-24">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-chart-1"
          style={{ width: `${(count / maxCount) * 100}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {count.toLocaleString()}
      </span>
    </li>
  );
}

function Breakdown({ title, buckets }: { title: string; buckets: Json[] }) {
  const entries = sumBuckets(buckets);
  const maxCount = entries[0]?.count ?? 0;
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
            <BreakdownRow key={entry.key} label={prettyKey(entry.key)} count={entry.count} maxCount={maxCount} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * P9.6-U3 honesty fix: `events` (raw `scan_events`, limited to the last 10)
 * used to render "No scans yet" whenever it was empty — even for a code
 * with real lifetime activity. That's a real, reachable false statement:
 * `scan_events` and the `scan_daily` rollups the chart above reads have
 * DIFFERENT retention (lib/purge.ts — raw events trim at the plan's
 * `analyticsRetentionDays`, 30 free / 365 Pro; rollups trim at 400 days),
 * so a code scanned only outside the raw-event retention window has real,
 * chartable history with zero raw events left to list here.
 * `lifetimeScans` (qr_codes.scan_count, threaded down from the page's
 * DynamicCodeSummary) is data this page already has and is exactly the
 * fact needed to tell the two cases apart honestly.
 */
function RecentActivity({
  events,
  cityGeo,
  lifetimeScans,
}: {
  events: RecentEvent[];
  cityGeo: boolean;
  lifetimeScans: number;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {lifetimeScans > 0
          ? `No recent activity to show here, though this code has ${lifetimeScans.toLocaleString()} scans on record. See the chart above for its full history.`
          : "No scans yet. Activity shows up here the moment someone scans this code."}
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
 * The three range-scoped stat tiles (Scans / Peak day / Today so far),
 * split out from `CodeAnalyticsPanel` (P9.6-U3 review round 1) so the
 * detail page can mount them in the left identity rail instead of the
 * right analysis column — orchestrator design note: the left rail had a
 * lot of dead space next to the right column's full analytics stack, and
 * these numbers read better beside the code's own identity than buried
 * under the chart. Still driven by the SAME range-scoped `dailyRows`/
 * `scansToday` props `CodeAnalyticsPanel` receives
 * (app/(app)/codes/[slug]/page.tsx passes both components the same
 * values) — the range selector living in `CodeAnalyticsPanel` still drives
 * both, since both re-render from the same server-fetched `range`-scoped
 * data on every `?range=` navigation.
 *
 * A plain `flex flex-col` stack, not a grid: this rail is already narrow
 * (~320-360px) and always single-column here, so there's no responsive
 * column count to get wrong — deliberately avoiding a second grid to audit
 * right after review round 1 found a real overflow bug in this file's
 * OTHER two grids (missing base `grid-cols-N`, and `lg:grid-cols-4`
 * squeezing BreakdownRow below its own minimum content width — see the
 * Breakdown/BreakdownRow comments below).
 */
export function CodeStatTiles({
  range,
  dailyRows,
  scansToday,
}: {
  range: RangeDays;
  dailyRows: DailyRow[];
  scansToday: number;
}) {
  const series = toChartSeries(dailyRows, range);
  const rangeTotal = dailyRows.reduce((sum, row) => sum + row.scans, 0);
  const peakDay = peakDayFrom(series);

  return (
    <div className="flex flex-col gap-4">
      <AnimatedStatTile
        label="Scans"
        value={rangeTotal.toLocaleString()}
        caption={`last ${rangeLabel(range)}`}
      />
      <AnimatedStatTile
        label="Peak day"
        value={peakDay.scans.toLocaleString()}
        caption={peakDay.day ? formatDate(peakDay.day) : undefined}
      />
      <AnimatedStatTile label="Today so far" value={scansToday.toLocaleString()} />
    </div>
  );
}

/**
 * P6-U3 per-code analytics surface: chart, breakdowns, recent activity.
 * The Scans/Peak day/Today so far stat tiles that used to render here moved
 * to `CodeStatTiles` above at P9.6-U3 review round 1 (mounted in the left
 * identity rail instead) — this component no longer takes `scansToday`,
 * since that was only ever used for the tile that left. Client component
 * only because Recharts needs the DOM (ChartContainer's ResponsiveContainer)
 * — every prop here is server-fetched in app/(app)/codes/[slug]/page.tsx
 * and passed straight in; zero client-side data fetching (spec).
 */
export function CodeAnalyticsPanel({
  plan,
  range,
  dailyRows,
  recentEvents,
  lifetimeScans,
}: {
  plan: Plan;
  range: RangeDays;
  dailyRows: DailyRow[];
  recentEvents: RecentEvent[];
  /** qr_codes.scan_count — see RecentActivity's own doc comment for why
   *  this page needs it alongside `recentEvents`. */
  lifetimeScans: number;
}) {
  const cityGeo = PLAN_LIMITS[plan].cityGeo;
  const maxDays = maxRangeDaysFor(plan);
  const series = toChartSeries(dailyRows, range);
  const rangeTotal = dailyRows.reduce((sum, row) => sum + row.scans, 0);
  // Only "does the chart have anything to plot" is needed here now — the
  // Peak day figure itself moved to CodeStatTiles above (P9.6-U3 review
  // round 1), which computes peakDayFrom(series) itself from the same
  // dailyRows/range props. See peakDayFrom's own doc comment (lib/analytics.ts)
  // for why it can't just be `series.reduce(..., series[0])`.
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
                  ticks={axisTicks(series)}
                  tickFormatter={formatDate}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(label) => formatDate(String(label))} />}
                />
                {/* Two series, one color each (violet scans, cyan uniques) —
                    the chart had no legend at all before P9.6-U3, so nothing
                    on the page said which line was which.
                    ChartLegend/ChartLegendContent (components/ui/chart.tsx)
                    already existed for exactly this, just unused
                    repo-wide until now. */}
                <ChartLegend content={<ChartLegendContent />} />
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

      {/* sm:grid-cols-2, not lg:grid-cols-4, is this grid's floor now that
          P9.6-U3 confines it to the detail page's right rail instead of the
          full page width the pre-U3 layout gave it: a BreakdownRow's fixed
          parts alone (label sm:w-24 = 96px + count w-12 = 48px + gap-3 x2 =
          24px = 168px minimum, before the flexible bar gets anything) don't
          fit a 4-column split of that narrower rail until xl: (1280px,
          where the rail is wide enough — measured, not guessed: a 1024px
          viewport put each lg:grid-cols-4 column at 124px, well under the
          168px floor, and the row's children overflowed their own <li>
          silently since nothing here wraps or clips them). xl:grid-cols-4
          is the first breakpoint where the math holds. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
            <RecentActivity events={recentEvents} cityGeo={cityGeo} lifetimeScans={lifetimeScans} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
