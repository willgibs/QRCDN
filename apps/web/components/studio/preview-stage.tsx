import type { ScannabilityReport } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";
import { ArtifactStage } from "@/components/brand/artifact-stage";
import { ScannabilityChip } from "./scannability-chip";

/** Quiet tiled QR-module texture for the preview stage floor — same motif
 *  family as HeroBackdrop's `qr-grid`, but tiled edge-to-edge instead of
 *  radially masked (this is a bounded stage, not a full-bleed hero) and kept
 *  under the ≤0.035 opacity ceiling from the design-system guide. */
function ModuleGridBackdrop() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full text-foreground opacity-[0.025] dark:opacity-[0.035]"
    >
      <defs>
        <pattern id="studio-grid" width="72" height="72" patternUnits="userSpaceOnUse">
          <rect x="6" y="6" width="6" height="6" fill="currentColor" />
          <rect x="18" y="6" width="6" height="6" fill="currentColor" opacity="0.6" />
          <rect x="6" y="18" width="6" height="6" fill="currentColor" opacity="0.5" />
          <rect x="42" y="12" width="6" height="6" fill="currentColor" opacity="0.55" />
          <rect x="54" y="30" width="6" height="6" fill="currentColor" opacity="0.4" />
          <rect x="24" y="42" width="6" height="6" fill="currentColor" opacity="0.6" />
          <rect x="48" y="54" width="6" height="6" fill="currentColor" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#studio-grid)" />
    </svg>
  );
}

// Same 2-tone checker family as color-controls.tsx's TransparentPaperChip,
// scaled up for the mat itself — the universal "transparent" affordance,
// kept quiet (~4% contrast) so it reads as a hint, not a texture.
const MAT_CHECKER_SQUARE_PX = 12;
const MAT_CHECKER_PATTERN =
  "conic-gradient(currentcolor 90deg, transparent 0 180deg, currentcolor 0 270deg, transparent 0)";

/** Underlay shown inside the paper mat when `background.transparent` is on
 *  — the QR's own SVG omits its background rect entirely in that case
 *  (packages/qr-engine/src/render.ts), so without this the mat would just
 *  show its `--qr-bg` fallback as a second solid color with no indication
 *  anything is actually transparent. */
function TransparencyChecker() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-2xl text-foreground opacity-[0.04] dark:opacity-[0.06]"
      style={{
        backgroundImage: MAT_CHECKER_PATTERN,
        backgroundSize: `${MAT_CHECKER_SQUARE_PX}px ${MAT_CHECKER_SQUARE_PX}px`,
      }}
    />
  );
}

/**
 * The studio QR restaged as a floating luminous artifact (Resend grammar),
 * not a glass gradient-border frame — frames stay reserved for window-
 * chrome treatments like `ProductWindow` (explore/product-window.tsx).
 * `ArtifactStage` supplies the ambient glow (tinted live by the kit's own
 * ink color); the paper-hex mat beneath the QR kills the old `--qr-bg`
 * seam, so mat + code read as one seamless card floating on the stage
 * floor. `svg` is produced by our own deterministic `renderQr` one level up
 * (studio-shell.tsx), so `dangerouslySetInnerHTML` here is safe.
 *
 * The outer `<section>` picks up `lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]`
 * from its caller (studio-shell.tsx): at lg+ the stage pins below the sticky
 * top bar while `ControlsRail` scrolls past it — the page (not the rail) is
 * still the scrolling element, `lg:top-24` (6rem) is the top bar's own
 * rendered height (~4rem) plus `<main>`'s `lg:py-8` top padding (2rem), and
 * the height mirrors that same padding on the bottom edge so the stage
 * never crowds the viewport edges. Below `lg` the column stacks normally
 * (no sticky, no fixed height). `items-center justify-center` here centers
 * the artifact + chip block within whatever height the section ends up
 * with, sticky or stacked (P4-U3 deliverable #5; P4 design-iteration
 * note 1 replaced the old `lg:self-stretch` contract with this one).
 */
export function PreviewStage({
  svg,
  payload,
  report,
  renderError,
  inkHex,
  paperHex,
  transparentBackground = false,
  className,
}: {
  svg: string;
  payload: string;
  report: ScannabilityReport;
  /** Set when `svg` is a placeholder render, not a render of `payload` — see
   *  lib/preview.ts. Takes over the status-chip slot with an explicit error
   *  instead of a misleading "Scannable" read on unrelated content. */
  renderError?: string | null;
  /** Solid fill color or first gradient stop (studio-shell derives this the
   *  same way controls-rail does) — drives the ambient bloom's hue. */
  inkHex: string;
  /** `validStyle.background.color`, or `var(--qr-bg)` when
   *  `background.transparent` is on — the mat's own background. */
  paperHex: string;
  /** `validStyle.background.transparent` — renders the checkerboard underlay
   *  inside the mat so "transparent" reads as an intentional state, not a
   *  second solid paper color. */
  transparentBackground?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label="Live preview"
      className={cn(
        "relative isolate flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-surface-studio px-6 py-12 sm:min-h-[520px] sm:px-10",
        className,
      )}
    >
      <ModuleGridBackdrop />
      <div className="relative z-10 w-full max-w-md">
        <ArtifactStage glowColor={inkHex} className="mx-auto w-full max-w-[320px]">
          <div
            className="relative w-full overflow-hidden rounded-2xl p-5 shadow-xl shadow-black/25 ring-1 ring-black/5 transition-[background-color] duration-(--duration-fast) ease-(--motion-ease-out) dark:shadow-black/50 dark:ring-white/10"
            style={{ backgroundColor: paperHex }}
          >
            {transparentBackground && <TransparencyChecker />}
            <div
              role="img"
              aria-label={`QR preview for ${payload}`}
              className="relative [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </ArtifactStage>
        <p className="mt-6 truncate text-center font-mono text-xs text-muted-foreground">
          {payload}
        </p>
        <div className="mt-3 flex justify-center">
          {renderError ? (
            <p
              role="alert"
              className="max-w-[280px] text-center text-xs text-destructive"
            >
              {renderError}
            </p>
          ) : (
            <ScannabilityChip report={report} />
          )}
        </div>
      </div>
    </section>
  );
}
