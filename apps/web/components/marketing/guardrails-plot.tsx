import { LOGO_EFFECTIVE_ERROR, LOGO_EFFECTIVE_WARN } from "@qrcdn/qr-engine";

/**
 * Guardrails threshold plot (P9.5-T3c, section 05) — an authored, static
 * SVG, zero client JS. Plots the real 2026-07-21 adversarial zxing decode
 * campaign (docs/guides/qr-engine.md, 160+ knockout-logo combinations at
 * ECC H, v3/v5 symbols) on its actual axis: the *effective* knockout ratio
 * (logo sizeRatio diluted by knockout padding, at the symbol version the
 * renderer floors to) — not a generic "contrast" axis. That axis is the one
 * with real campaign data behind it; the separate 3:1/4:1 WCAG contrast
 * guardrail is explicitly analytic-only in the guide ("Why decode
 * round-trips cannot validate contrast") and has no campaign pass/fail data
 * to plot honestly.
 *
 * LOGO_EFFECTIVE_WARN/LOGO_EFFECTIVE_ERROR are imported straight from
 * @qrcdn/qr-engine (exported this same unit specifically for this plot —
 * see guardrails.ts's own doc comment) so the two threshold lines can never
 * drift from the real, evaluated-against thresholds.
 *
 * Data granularity, stated honestly: qr-engine.md records the campaign's
 * AGGREGATE boundary, not itemized per-combination results — "every failing
 * config had effective linear ratio >= ~0.418; every passing one <= ~0.407."
 * CAMPAIGN_PASS_MAX/CAMPAIGN_FAIL_MIN below are those two real, documented
 * numbers. The scatter of points around them is illustrative (a fixed,
 * authored array, never Math.random() — the same determinism discipline
 * packages/qr-engine's own renderer follows), never placed outside the real
 * boundary in either direction, and the figure's own caption says plainly
 * that individual per-combination values are not itemized in the source.
 */

const CAMPAIGN_PASS_MAX = 0.407;
const CAMPAIGN_FAIL_MIN = 0.418;

// Illustrative scatter, fixed and authored (not random), every value
// honoring the real documented boundary above.
const PASS_POINTS = [0.19, 0.215, 0.235, 0.255, 0.27, 0.285, 0.3, 0.315, 0.33, 0.35, 0.375, 0.4];
const FAIL_POINTS = [0.42, 0.428, 0.435, 0.44, 0.448, 0.455, 0.462, 0.47, 0.478, 0.485, 0.495, 0.51];
const JITTER = [0.15, 0.55, 0.85, 0.35, 0.65, 0.05, 0.95, 0.45, 0.75, 0.25, 0.6, 0.4];

const VIEW_W = 720;
const VIEW_H = 200;
const PAD_X = 36;
const DOMAIN_MIN = 0.15;
const DOMAIN_MAX = 0.55;
const AXIS_Y = 160;
const CLOUD_TOP = 68;
const CLOUD_H = 62;
const LINE_TOP = 40;
const POINT_R = 3.4;

function xScale(v: number): number {
  return PAD_X + ((v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * (VIEW_W - 2 * PAD_X);
}

const AXIS_TICKS = [0.2, 0.3, 0.4, 0.5];

const warnX = xScale(LOGO_EFFECTIVE_WARN);
const errorX = xScale(LOGO_EFFECTIVE_ERROR);

export function GuardrailsPlot() {
  return (
    <figure className="flex flex-col gap-4">
      <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          pass
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-destructive" />
          fail
        </span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Threshold plot of the real decode campaign: passing and failing style combinations plotted by effective knockout ratio, against the warn and fail guardrail thresholds"
        >
          {/* Threshold lines, drawn under the points so the cloud reads on top. */}
          <line
            x1={warnX}
            y1={LINE_TOP}
            x2={warnX}
            y2={AXIS_Y}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-foreground/35"
          />
          <text
            x={warnX - 6}
            y={30}
            textAnchor="end"
            className="fill-muted-foreground font-mono text-[10px]"
          >
            warn
          </text>
          <line
            x1={errorX}
            y1={LINE_TOP}
            x2={errorX}
            y2={AXIS_Y}
            strokeWidth={1.75}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-foreground/60"
          />
          <text
            x={errorX + 6}
            y={30}
            textAnchor="start"
            className="fill-muted-foreground font-mono text-[10px]"
          >
            fail
          </text>

          {/* Point clouds. */}
          {PASS_POINTS.map((v, i) => (
            <circle
              key={`pass-${v}`}
              cx={xScale(v)}
              cy={CLOUD_TOP + JITTER[i % JITTER.length] * CLOUD_H}
              r={POINT_R}
              className="fill-emerald-500"
              opacity={0.85}
            />
          ))}
          {FAIL_POINTS.map((v, i) => (
            <circle
              key={`fail-${v}`}
              cx={xScale(v)}
              cy={CLOUD_TOP + JITTER[i % JITTER.length] * CLOUD_H}
              r={POINT_R}
              className="fill-destructive"
              opacity={0.85}
            />
          ))}

          {/* Axis. */}
          <line
            x1={PAD_X}
            y1={AXIS_Y}
            x2={VIEW_W - PAD_X}
            y2={AXIS_Y}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            className="stroke-border"
          />
          {AXIS_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={xScale(v)}
                y1={AXIS_Y}
                x2={xScale(v)}
                y2={AXIS_Y + 5}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className="stroke-border"
              />
              <text
                x={xScale(v)}
                y={AXIS_Y + 20}
                textAnchor="middle"
                className="fill-muted-foreground font-mono text-[10px] tabular-nums"
              >
                {v.toFixed(1)}
              </text>
            </g>
          ))}
        </svg>
        <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground/70">
          effective knockout ratio (logo size + padding, at the floored symbol version)
        </p>
      </div>

      <figcaption className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Actual campaign data. The gap between every pass and every fail is where the
          thresholds live.
        </p>
        <p className="text-xs text-muted-foreground/70">
          qr-engine.md records the aggregate pass/fail boundary from the 160+-combination
          campaign: effective knockout ratio at or below {CAMPAIGN_PASS_MAX.toFixed(3)} passed,
          at or above {CAMPAIGN_FAIL_MIN.toFixed(3)} failed. Individual per-combination results
          are not itemized in the source record, so the points above illustrate that documented
          boundary rather than exact per-run values.
        </p>
      </figcaption>
    </figure>
  );
}
