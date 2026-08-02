import { buildSparkline, SPARKLINE_VIEW_H, SPARKLINE_VIEW_W } from "@/lib/sparkline";

/**
 * The /codes table's per-row sparkline (P9.6-U2) — the board's headline ask
 * for this unit ("Robinhood uses a similar per-stock-ticker daily chart in
 * ticker rows"). Hand-authored inline SVG, deliberately NOT Recharts:
 * rendering up to 250 Recharts instances (Pro's `dynamicCodes` cap) on one
 * page would be a real performance problem, not a theoretical one. A
 * `<polyline>` in a fixed viewBox, server-rendered, zero client JS — no
 * "use client" anywhere in this file.
 *
 * Plain stroke, no area fill and no gridlines/axis — the Robinhood reference
 * this unit is chasing is exactly this minimal (a bare colored line), and
 * skipping the fill/gradient `<defs>` this component would otherwise need
 * keeps each instance's markup smaller across up to 250 repeats. One accent
 * color regardless of a code's status (D13's single-accent-violet rule) —
 * the Status pill already carries state; this is a volume/shape signal, not
 * a second place to encode status.
 *
 * `aria-hidden`: decorative/supplementary to the adjacent Scans cell, which
 * already states the exact number — same posture `dashboard-window.tsx`'s
 * own inline chart SVG takes.
 */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  const { points, lastPoint, hasActivity } = buildSparkline(values);

  if (!points) {
    // Only when `values` itself is empty — scan_sparklines' zero-fill
    // contract (P9.6-U1) means a real row is always dense, so this is
    // purely defensive (e.g. a code missing from the RPC result for some
    // unforeseen reason) rather than an expected path.
    return null;
  }

  const stroke = hasActivity ? "var(--chart-1)" : "var(--muted-foreground)";

  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_VIEW_W} ${SPARKLINE_VIEW_H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={hasActivity ? 1.75 : 1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={hasActivity ? 1 : 0.5}
      />
      {hasActivity && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={1.75} fill="var(--chart-1)" />
      )}
    </svg>
  );
}
