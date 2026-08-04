import { Card, CardContent } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { cn } from "@/lib/utils";
import { ProductWindow } from "./product-window";

/**
 * Analytics product shot, refreshed to the real /codes chart shapes (P9-U2)
 * — study components/codes/codes-overview-panel.tsx: identical AreaChart/
 * gradient/tooltip config, and the same Card-based StatTile pattern (label /
 * large tabular-nums value / mono caption) rather than the P2-era ad hoc
 * motion-popping <p> stats and a fabricated "top codes" list that doesn't
 * exist on the real overview panel.
 *
 * P9.5-T1a: Recharts (~150-200KB client bundle) came out of this file —
 * docs/guides/design-system.md's own "chart placement" rule reserves
 * Recharts for dashboard routes, never marketing, and this chart was
 * always a static, non-interactive decoration, so the dependency bought
 * nothing but client JS on the landing page. Replaced with a hand-authored
 * SVG area chart computed once at module scope from the same static
 * `scans` data: no "use client", no hooks, zero bytes shipped to the
 * browser for this component. The gradient/grid/line colors reference
 * `var(--chart-1)`/`var(--border)` directly (this SVG renders inline in
 * the page DOM — never exported/downloaded — so CSS custom properties are
 * fine here; the sRGB-hex-only hard rule is about qr-engine's exported QR
 * assets, not in-page decoration).
 *
 * P9.5-T3b ("one window, more instrument"): breakdown rows (Top countries/
 * Devices, bar-list enrichment beyond the real Breakdown component's plain
 * label+count row — see the honest-register note above TOP_COUNTRIES/
 * DEVICES), a third "Today so far" stat tile with a CSS-only pulsing dot
 * (motion-safe-gated), and the retention row moved in from the section's
 * own MonoStrip to live inside this window's chrome instead (a footer
 * strip bookending the header bar).
 */
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

const SCAN_TOTAL = scans.reduce((sum, point) => sum + point.scans, 0);

/**
 * Breakdown rows (P9.5-T3b) — "Top countries"/"Devices", the same two
 * labels + `<h3>`-then-`<ul>` shape `code-analytics-panel.tsx`'s real
 * `Breakdown` component uses (that one has no bars; the bar fill here is a
 * marketing-only enrichment, "depth," not a claim of pixel-identical
 * product chrome — this static window has never been a literal screenshot,
 * see the module header above). Demo counts are honest-register: Devices
 * is a closed enumeration of every scan, so it sums to exactly SCAN_TOTAL;
 * Countries is a "top 4 of many" list and deliberately does NOT sum to the
 * total (a real top-N list never does — the remainder is everywhere else).
 */
const TOP_COUNTRIES = [
  { label: "United States", count: 2540 },
  { label: "United Kingdom", count: 890 },
  { label: "Germany", count: 612 },
  { label: "Canada", count: 401 },
] as const;

const DEVICES = [
  { label: "Mobile", count: 4206 },
  { label: "Desktop", count: 1180 },
  { label: "Tablet", count: 245 },
] as const;

// Static — mirrors RangeSelector's real labels (lib/analytics.ts's
// rangeLabel: 365 → "1y", else "{days}d") as a decorative, non-interactive
// pill row; the real control lives on the app-only /codes page.
const RANGE_PILLS = ["7d", "30d", "90d", "1y"] as const;
const ACTIVE_RANGE = "30d";

// ---- Chart geometry — computed once at module scope from static data ----
const CHART_W = 760;
const CHART_H = 160;
const PAD_X = 10;
const PLOT_TOP = 14;
const BASELINE = 140;

const values = scans.map((point) => point.scans);
const MIN_V = Math.min(...values);
const MAX_V = Math.max(...values);
// Headroom above the peak so the stroke never touches the frame; the floor
// sits a little below the trough so the first point doesn't ride the
// bottom gridline. Not a real axis domain (there's no "0" tick to be
// honest about) — this is illustrative, same as the Recharts version it
// replaces, which auto-scaled its Y axis the same way.
const DOMAIN_MIN = MIN_V - (MAX_V - MIN_V) * 0.15;
const DOMAIN_MAX = MAX_V + (MAX_V - MIN_V) * 0.12;

function toPoint(index: number, value: number) {
  const x = PAD_X + (index / (scans.length - 1)) * (CHART_W - PAD_X * 2);
  const y =
    PLOT_TOP +
    (1 - (value - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * (BASELINE - PLOT_TOP);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

const POINTS = scans.map((point, i) => toPoint(i, point.scans));

/**
 * Smooth "monotone" cubic-Bezier through every point: each segment's two
 * control points sit at the horizontal midpoint between that pair, each
 * carried at ITS OWN endpoint's y (C{midX} {p0.y} {midX} {p1.y} {p1.x}
 * {p1.y}). Consecutive segments then share a flat (horizontal) tangent at
 * the shared midpoint, so the curve reads as one continuous line with no
 * overshoot past either point's y-value — unlike a naive Catmull-Rom
 * spline, this construction can never dip below or bulge above its
 * neighboring points, which matters for a chart (the curve should never
 * visually imply a data value that isn't there).
 */
function smoothPath(points: { x: number; y: number }[]): string {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = Math.round(((p0.x + p1.x) / 2) * 100) / 100;
    d += ` C${midX} ${p0.y} ${midX} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

const LINE_PATH = smoothPath(POINTS);
const AREA_PATH = `${LINE_PATH} L${POINTS[POINTS.length - 1].x} ${BASELINE} L${POINTS[0].x} ${BASELINE} Z`;

// Four dashed horizontal gridlines through the plot area — CartesianGrid's
// `vertical={false} strokeDasharray="3 3"` equivalent.
const GRID_Y = [0, 1, 2, 3].map((i) => PLOT_TOP + (i * (BASELINE - PLOT_TOP)) / 3);

// Date axis: first / one-third / two-thirds / last point — an authored,
// evenly-spaced subset (Recharts' own `interval="preserveStartEnd"` thins
// ticks the same way once ten labels don't fit the available width).
const AXIS_TICKS = [0, 3, 6, 9].map((i) => scans[i].day);

function StatTile({
  label,
  value,
  caption,
  live,
}: {
  label: string;
  value: string;
  caption?: string;
  /** "Today so far" only — a small pulsing dot reading as ambient live
   *  state (CSS-only `animate-pulse`, gated behind `motion-safe:` so it
   *  fully stops under prefers-reduced-motion). Not an auto-advancing
   *  story element: nothing it shows ever changes, it's just texture that
   *  says "this number is still counting." */
  live?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {label}
          {live && (
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
            />
          )}
        </span>
        <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        {caption && <p className="font-mono text-[11px] text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

/** Bar-list row shared by both breakdown columns — width is proportional to
 *  that column's OWN max value (a bar-list convention, not a claim the
 *  visible rows sum to 100%; see the honest-register note above
 *  TOP_COUNTRIES/DEVICES for why that matters for one column and not the
 *  other). */
function BreakdownRow({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-foreground sm:w-28">{label}</span>
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

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: readonly { label: string; count: number }[];
}) {
  const maxCount = Math.max(...rows.map((row) => row.count));
  return (
    <div>
      <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <BreakdownRow key={row.label} label={row.label} count={row.count} maxCount={maxCount} />
        ))}
      </ul>
    </div>
  );
}

export function DashboardWindow() {
  const total = SCAN_TOTAL;
  const peak = scans.reduce((max, point) => (point.scans > max.scans ? point : max), scans[0]);
  // Illustrative "so far today" figure — plausibly smaller than a full
  // day's final count (Jul 19's 941), never re-typed against SCAN_TOTAL
  // since "today" isn't part of the 10-point sample above.
  const scansToday = 318;

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
        <div className="h-40 w-full">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            /* P9.7-V5: was preserveAspectRatio="none", which stretched this 760x160
             viewBox to ~1024px wide and flattened every slope in it by roughly
             35%. The curve drawn was not the shape of its own data. */
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="marketingScansFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {GRID_Y.map((y) => (
              <line
                key={y}
                x1={PAD_X}
                y1={y}
                x2={CHART_W - PAD_X}
                y2={y}
                strokeWidth="1"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
                className="stroke-border"
              />
            ))}
            <path d={AREA_PATH} fill="url(#marketingScansFade)" stroke="none" />
            <path
              d={LINE_PATH}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
          {AXIS_TICKS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatTile label="Scans" value={total.toLocaleString()} caption={`last ${ACTIVE_RANGE}`} />
          <StatTile label="Peak day" value={peak.scans.toLocaleString()} caption={peak.day} />
          <StatTile label="Today so far" value={scansToday.toLocaleString()} live />
        </div>

        <div className="mt-6 grid gap-6 border-t border-border/60 pt-6 sm:grid-cols-2">
          <Breakdown title="Top countries" rows={TOP_COUNTRIES} />
          <Breakdown title="Devices" rows={DEVICES} />
        </div>
      </div>

      {/* Retention row (P9.5-T3b) — moved inside the window's own chrome
          (a footer strip bookending the "Scan activity" header bar above)
          rather than living in a MonoStrip below the section, per the
          spec's "enrich inside the same window frame" framing. Numbers
          read straight from lib/entitlements.ts, never retyped (hard rule). */}
      <div className="flex items-center justify-center border-t border-border/60 px-6 py-3 font-mono text-[11px] text-muted-foreground">
        {PLAN_LIMITS.free.analyticsRetentionDays}-day history free ·{" "}
        {PLAN_LIMITS.pro.analyticsRetentionDays}-day + city-level on Pro
      </div>
    </ProductWindow>
  );
}
