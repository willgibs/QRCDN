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
 * The outer `<section>` picks up `lg:self-stretch` from its caller
 * (studio-shell.tsx) so it fills the full stage height at tall viewports;
 * `items-center justify-center` here then centers the artifact + chip block
 * within that height instead of leaving it top-anchored with dead space
 * below (P4-U3 deliverable #5).
 */
export function PreviewStage({
  svg,
  payload,
  report,
  renderError,
  inkHex,
  paperHex,
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
  /** `validStyle.background.color` — the mat's own background. Falls back
   *  to `var(--qr-bg)` if `background.transparent` is ever exposed. */
  paperHex: string;
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
            className="w-full rounded-2xl p-5 shadow-xl shadow-black/25 ring-1 ring-black/5 transition-[background-color] duration-(--duration-fast) ease-(--motion-ease-out) dark:shadow-black/50 dark:ring-white/10"
            style={{ backgroundColor: paperHex }}
          >
            <div
              role="img"
              aria-label={`QR preview for ${payload}`}
              className="[&_svg]:h-auto [&_svg]:w-full"
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
