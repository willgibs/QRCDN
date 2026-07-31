import { Card, CardContent } from "@/components/ui/card";
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
        <div className="h-40 w-full">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <StatTile label="Scans" value={total.toLocaleString()} caption={`last ${ACTIVE_RANGE}`} />
          <StatTile label="Peak day" value={peak.scans.toLocaleString()} caption={peak.day} />
        </div>
      </div>
    </ProductWindow>
  );
}
