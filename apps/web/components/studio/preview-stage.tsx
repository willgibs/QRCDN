import type { ScannabilityReport } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";
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
 * Live QR render inside a glass gradient-border frame — the same treatment
 * family as `ProductWindow` (explore/product-window.tsx), minus its browser
 * chrome bar since this is the real app surface, not a marketing mockup.
 * `svg` is produced by our own deterministic `renderQr` one level up
 * (studio-shell.tsx), so `dangerouslySetInnerHTML` here is safe.
 *
 * The outer `<section>` picks up `lg:self-stretch` from its caller
 * (studio-shell.tsx) so it fills the full stage height at tall viewports;
 * `items-center justify-center` here then centers the frame + chip block
 * within that height instead of leaving it top-anchored with dead space
 * below (P4-U3 deliverable #5).
 */
export function PreviewStage({
  svg,
  payload,
  report,
  className,
}: {
  svg: string;
  payload: string;
  report: ScannabilityReport;
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
        <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/25 via-border/60 to-border/20 p-px shadow-2xl shadow-primary/10">
          <div className="rounded-[calc(var(--radius)+12px)] bg-card p-6 sm:p-8">
            <div className="mx-auto w-full max-w-[320px] rounded-xl bg-qr-bg p-5">
              <div
                role="img"
                aria-label={`QR preview for ${payload}`}
                className="[&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
            <p className="mt-4 truncate text-center font-mono text-xs text-muted-foreground">
              {payload}
            </p>
            <div className="mt-3 flex justify-center">
              <ScannabilityChip report={report} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
