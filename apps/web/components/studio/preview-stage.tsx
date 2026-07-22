import type { ScannabilityReport } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";
import { TiltStage } from "@/components/brand/tilt-stage";
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
 * The studio QR restaged as an interactive 3D artifact (founder round-3
 * note 2) — `TiltStage` replaces the round-2 `ArtifactStage` glow-bloom rig
 * on this one surface; the bloom rig itself is untouched and stays the P9
 * marketing-artifact treatment (`components/brand/artifact-stage.tsx`). See
 * docs/guides/design-system.md's "Luminous staging grammar" section for the
 * studio-vs-marketing split. The paper-hex mat beneath the QR still kills
 * the old `--qr-bg` seam, so mat + code read as one seamless card that now
 * faces the cursor and catches a moving specular sheen while it's on stage.
 * `svg` is produced by our own deterministic `renderQr` one level up
 * (studio-shell.tsx), so `dangerouslySetInnerHTML` here is safe.
 *
 * Caption + status block sit in their OWN absolutely-positioned layer,
 * pinned to the stage floor and decoupled from the section's
 * `items-center` vertical centering that positions `TiltStage` — this is
 * deliberate, not incidental: round 3 turned the status block into a real
 * instrument panel (`ScannabilityChip` now renders a full, unclipped issue
 * list, not a one-line truncated message), and issues appearing/clearing
 * changes that block's height on every keystroke. If it lived in normal
 * flow alongside the card, the section's `items-center` would recenter the
 * whole (now taller) column and the card would visibly jump. Anchoring this
 * block to the floor independently means it can grow as tall as it needs
 * to without ever moving the artifact above it.
 *
 * The outer `<section>` picks up `lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]`
 * from its caller (studio-shell.tsx): at lg+ the stage pins below the sticky
 * top bar while `ControlsRail` scrolls past it — the page (not the rail) is
 * still the scrolling element, `lg:top-24` (6rem) is the top bar's own
 * rendered height (~4rem) plus `<main>`'s `lg:py-8` top padding (2rem), and
 * the height mirrors that same padding on the bottom edge so the stage
 * never crowds the viewport edges. Below `lg` the column stacks normally
 * (no sticky, no fixed height). `items-center justify-center` here centers
 * the artifact within whatever height the section ends up with, sticky or
 * stacked (P4-U3 deliverable #5; P4 design-iteration note 1 replaced the
 * old `lg:self-stretch` contract with this one).
 */
export function PreviewStage({
  svg,
  payload,
  report,
  version,
  renderError,
  inkHex,
  paperHex,
  transparentBackground = false,
  className,
}: {
  svg: string;
  payload: string;
  report: ScannabilityReport;
  /** The QR symbol version `renderQr` actually encoded at
   *  (`PreviewRenderResult.version` — lib/preview.ts). `null` on the
   *  render-error path, where the chip never mounts anyway. */
  version: number | null;
  /** Set when `svg` is a placeholder render, not a render of `payload` — see
   *  lib/preview.ts. Takes over the status-chip slot with an explicit error
   *  instead of a misleading "Scannable" read on unrelated content. */
  renderError?: string | null;
  /** Solid fill color or first gradient stop (studio-shell derives this the
   *  same way controls-rail does) — drives the tilt floor shadow's hue. */
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
      <TiltStage glowColor={inkHex} className="relative z-10 mx-auto w-full max-w-[320px]">
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
      </TiltStage>
      {/* Floor-pinned status layer — see the doc comment above for why this
       *  is absolutely positioned instead of stacked under TiltStage in
       *  normal flow. */}
      <div className="absolute inset-x-6 bottom-8 z-10 mx-auto flex w-full max-w-md flex-col items-center gap-3 sm:inset-x-10">
        <p className="w-full truncate text-center font-mono text-xs text-muted-foreground">
          {payload}
        </p>
        {renderError ? (
          <div
            role="alert"
            className="flex w-full max-w-[34rem] items-start gap-2 text-left text-xs leading-snug text-destructive"
          >
            <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
            <span>{renderError}</span>
          </div>
        ) : (
          <ScannabilityChip report={report} version={version} />
        )}
      </div>
    </section>
  );
}
