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
const pct = (v: number) => ((v - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * 100;

/**
 * The gauge is HTML positioned by percentage, not one scaled SVG. The first
 * build drew everything (labels included) in a 1000-unit viewBox scaled to
 * the container, which rendered its 11-13-unit type at ~4-5px on a 390px
 * viewport: illegible. Geometry that should stretch (the band, the track,
 * the ticks) is absolutely-positioned divs; type stays type, at real pixel
 * sizes, at every width. The two alpha fills use inline srgb color-mix
 * rather than Tailwind opacity utilities per the T3b iOS-Safari finding
 * (design-system.md: oklab color-mix mis-painting).
 */
function Gauge() {
  const warnPct = pct(LOGO_EFFECTIVE_WARN);
  const failPct = pct(LOGO_EFFECTIVE_ERROR);
  const passPct = pct(CAMPAIGN_PASS_MAX);
  const brokePct = pct(CAMPAIGN_FAIL_MIN);

  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={`Effective knockout ratio from ${DOMAIN_MIN} to ${DOMAIN_MAX}. Our warn threshold sits at ${LOGO_EFFECTIVE_WARN}, below ${CAMPAIGN_PASS_MAX}, the highest ratio that still decoded. Our fail threshold sits at ${LOGO_EFFECTIVE_ERROR}, inside the gap between that and ${CAMPAIGN_FAIL_MIN}, the lowest ratio that failed. Nothing was ever observed inside that gap.`}
      >
        {/* our thresholds, imported from the engine — labels above the track */}
        <div aria-hidden className="relative h-5 font-mono text-[12px] text-foreground">
          {[
            { at: warnPct, label: `warn ${LOGO_EFFECTIVE_WARN}` },
            { at: failPct, label: `fail ${LOGO_EFFECTIVE_ERROR}` },
          ].map((t) => (
            <span
              key={t.label}
              className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${t.at}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div aria-hidden className="relative mt-1.5 h-9">
          {/* the band nothing was ever observed in: between the best pass and
              the worst fail. Our two thresholds live inside it. */}
          <div
            className="absolute inset-y-0"
            style={{
              left: `${passPct}%`,
              width: `${brokePct - passPct}%`,
              backgroundColor: "color-mix(in srgb, var(--muted-foreground) 13%, transparent)",
            }}
          />
          {/* the track */}
          <div className="absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 bg-border" />
          <div
            className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2"
            style={{
              width: `${warnPct}%`,
              backgroundColor: "color-mix(in srgb, var(--primary) 55%, transparent)",
            }}
          />
          {/* threshold ticks */}
          <div
            className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-primary"
            style={{ left: `${warnPct}%` }}
          />
          <div
            className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-primary"
            style={{ left: `${failPct}%` }}
          />
          {/* leader stubs down toward the campaign labels below */}
          <div
            className="absolute top-1/2 -bottom-2 w-px bg-muted-foreground"
            style={{ left: `${passPct}%` }}
          />
          <div
            className="absolute top-1/2 -bottom-2 w-px bg-muted-foreground"
            style={{ left: `${brokePct}%` }}
          />
        </div>

        {/* what the campaign actually observed. The min() clamps keep each
            label inside the container at narrow widths instead of clipping
            (ch units: the labels are 16 and 17 characters of mono). */}
        <div aria-hidden className="relative mt-3 h-10 font-mono text-[12px] text-muted-foreground">
          <span
            className="absolute top-0 whitespace-nowrap"
            style={{ right: `min(calc(${(100 - passPct).toFixed(3)}% + 6px), calc(100% - 17ch))` }}
          >
            {`last pass ~${CAMPAIGN_PASS_MAX}`}
          </span>
          <span
            className="absolute top-5 whitespace-nowrap"
            style={{ left: `min(calc(${brokePct.toFixed(3)}% + 6px), calc(100% - 18ch))` }}
          >
            {`first fail ~${CAMPAIGN_FAIL_MIN}`}
          </span>
        </div>

        {/* Axis ends, because this scale does not start at zero and a reader
            should not have to assume where it starts. */}
        <div aria-hidden className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground/70">
          <span>{DOMAIN_MIN}</span>
          <span>{DOMAIN_MAX}</span>
        </div>
      </div>
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
