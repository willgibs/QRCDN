import {
  CONTRAST_ERROR_MIN,
  CONTRAST_WARN_MIN,
  LOGO_EFFECTIVE_ERROR,
  LOGO_EFFECTIVE_WARN,
} from "@qrcdn/qr-engine";

/**
 * The scannability figure (P9.7-V5), replacing `GuardrailsPlot` on the
 * landing.
 *
 * WHY THE PLOT WENT. Its scatter was authored, not measured: twelve pass
 * points and twelve fail points hand-typed as literals, because the source
 * record (`docs/guides/qr-engine.md`) keeps the campaign's AGGREGATE boundary
 * and never itemised per-combination results. The plot's own figcaption said
 * so, which is honest, but it means the most eye-catching thing in the section
 * was the one part carrying no information. Only its two endpoints were real.
 *
 * WHAT REPLACES IT. Those two endpoints, drawn as what they are. Every passing
 * configuration sat at or below 0.407 effective knockout ratio; every failing
 * one at or above 0.418. Our warn and fail lines are at 0.395 and 0.412, both
 * conservative relative to that. Precisely: warn (0.395) sits BELOW the best
 * observed pass; fail (0.412) sits INSIDE the gap between the best pass and
 * the worst fail, where nothing was observed at all. Those are two different
 * relationships and an earlier draft of this file flattened them into "both
 * below the highest ratio that still decoded", which is false for the fail
 * line. The e2e assertion below now encodes the real relationship, so the
 * copy cannot drift back.
 *
 * Both thresholds are imported from the engine, never retyped, so the drawing
 * cannot drift from what the code enforces. The two campaign observations are
 * literals here for the same reason the plot had them as literals: they live
 * in a prose doc, not in code. They carry a "~" in the source and the caption
 * says "about" rather than implying more precision than was recorded.
 *
 * Zero client JS, no engine render, deterministic geometry.
 */

/* Aggregate campaign boundary, `docs/guides/qr-engine.md` (2026-07-21, two
   adversarial zxing campaigns, ECC H, v3 and v5, 160+ combinations). The
   source writes these with a tilde: "≥ ~0.418" and "≤ ~0.407". */
const CAMPAIGN_PASS_MAX = 0.407;
const CAMPAIGN_FAIL_MIN = 0.418;

const DOMAIN_MIN = 0.375;
const DOMAIN_MAX = 0.435;
const W = 1000;
const H = 104;
const x = (v: number) => ((v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * W;

function Gauge() {
  const warnX = x(LOGO_EFFECTIVE_WARN);
  const failX = x(LOGO_EFFECTIVE_ERROR);
  const passX = x(CAMPAIGN_PASS_MAX);
  const brokeX = x(CAMPAIGN_FAIL_MIN);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Effective knockout ratio from ${DOMAIN_MIN} to ${DOMAIN_MAX}. Our warn threshold sits at ${LOGO_EFFECTIVE_WARN}, below ${CAMPAIGN_PASS_MAX}, the highest ratio that still decoded. Our fail threshold sits at ${LOGO_EFFECTIVE_ERROR}, inside the gap between that and ${CAMPAIGN_FAIL_MIN}, the lowest ratio that failed. Nothing was ever observed inside that gap.`}
      >
        {/* the band nothing was ever observed in: between the best pass and
            the worst fail. Our two thresholds live inside it. */}
        <rect
          x={passX}
          y={20}
          width={brokeX - passX}
          height={34}
          className="fill-muted-foreground"
          opacity={0.13}
        />
        {/* the track */}
        <rect x={0} y={36} width={W} height={2} className="fill-border" />
        <rect x={0} y={36} width={warnX} height={2} className="fill-primary" opacity={0.55} />

        {/* our thresholds, imported from the engine */}
        {[
          { at: warnX, label: `warn ${LOGO_EFFECTIVE_WARN}` },
          { at: failX, label: `fail ${LOGO_EFFECTIVE_ERROR}` },
        ].map((t) => (
          <g key={t.label}>
            <rect x={t.at - 1} y={20} width={2} height={34} className="fill-primary" />
            <text
              x={t.at}
              y={14}
              textAnchor="middle"
              className="fill-foreground font-mono"
              style={{ fontSize: 13 }}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* what the campaign actually observed */}
        {[
          { at: passX, label: `last pass ~${CAMPAIGN_PASS_MAX}`, y: 74, anchor: "end" as const, dx: -6 },
          { at: brokeX, label: `first fail ~${CAMPAIGN_FAIL_MIN}`, y: 92, anchor: "start" as const, dx: 6 },
        ].map((t) => (
          <g key={t.label}>
            <rect x={t.at - 0.5} y={30} width={1} height={t.y - 38} className="fill-muted-foreground" />
            <text
              x={t.at + t.dx}
              y={t.y}
              textAnchor={t.anchor}
              className="fill-muted-foreground font-mono"
              style={{ fontSize: 12 }}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Axis ends, because this scale does not start at zero and a reader
            should not have to assume where it starts. */}
        <text x={0} y={92} className="fill-muted-foreground font-mono" style={{ fontSize: 11 }} opacity={0.7}>
          {DOMAIN_MIN}
        </text>
        <text
          x={W}
          y={92}
          textAnchor="end"
          className="fill-muted-foreground font-mono"
          style={{ fontSize: 11 }}
          opacity={0.7}
        >
          {DOMAIN_MAX}
        </text>
      </svg>
      <figcaption className="mt-5 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
        Effective knockout ratio: how much of the code a logo covers once its padding is counted,
        at the symbol version the renderer actually uses. We start warning below anything that ever
        failed, and call it an error inside the gap where nothing was observed at all. Neither line
        waits for the ratio where codes actually broke.
      </figcaption>
    </figure>
  );
}

/** The other half: what the instrument checks live, as you design. */
function Instrument() {
  const checks = [
    { label: "Contrast", value: `${CONTRAST_WARN_MIN}:1 recommended`, note: `error below ${CONTRAST_ERROR_MIN}:1` },
    { label: "Logo coverage", value: `warn ${LOGO_EFFECTIVE_WARN}`, note: `error above ${LOGO_EFFECTIVE_ERROR}` },
    { label: "Error correction", value: "raised automatically", note: "when a logo knocks out modules" },
    { label: "Module size", value: "sparse dots flagged", note: "circles below half size" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5">
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Checked as you design
      </p>
      <dl className="mt-4">
        {checks.map((c, i) => (
          <div
            key={c.label}
            className={i === 0 ? "pb-3" : "border-t border-border/70 py-3 last:pb-0"}
          >
            <dt className="text-sm text-foreground">{c.label}</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {c.value} <span className="opacity-60">· {c.note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ScannabilityFigure() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-12">
      <Gauge />
      <Instrument />
    </div>
  );
}
