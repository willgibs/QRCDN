import { CONTRAST_ERROR_MIN, CONTRAST_WARN_MIN, contrastRatio } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";

/**
 * Inline ink-vs-paper contrast meter for the studio rail (P9.8-B4 rider —
 * the marketing playground has carried one since P9.5-T3b; the real studio
 * never did). Thresholds and the ratio itself come from the engine, never
 * retyped (the same imports `scannabilityReport` evaluates against), so the
 * meter can never disagree with the chip's own contrast issues.
 *
 * Reads a single ink/paper pair, which is exact for solid fills. For
 * gradient fills the caller passes the derived primary ink hex
 * (`inkHexFromStyle`), not the worst stop — the worst-stop refinement (and
 * transparent paper's theme-backdrop case, which the scannability chip
 * already grades correctly) rides the Phase C studio design round. The chip
 * remains the authority; this meter is glanceable feedback while dragging a
 * color, not a second verdict.
 */

/** Map a contrast ratio onto the meter's 0-100% track: 1:1 (identical
 *  colors) at the left edge, 8:1+ pinned at the right — wide enough that
 *  both thresholds (3, 4) land in the visually useful middle. */
function meterPercent(ratio: number): number {
  return Math.max(0, Math.min(100, ((ratio - 1) / 7) * 100));
}

export function ContrastMeter({ inkHex, paperHex }: { inkHex: string; paperHex: string }) {
  const ratio = contrastRatio(inkHex, paperHex);
  const zone = ratio < CONTRAST_ERROR_MIN ? "error" : ratio < CONTRAST_WARN_MIN ? "warn" : "clean";
  const failPct = meterPercent(CONTRAST_ERROR_MIN);
  const warnPct = meterPercent(CONTRAST_WARN_MIN);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
        <span>Contrast</span>
        <span
          className={cn(
            "tabular-nums",
            zone === "error" && "text-destructive",
            zone === "warn" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {ratio.toFixed(2)}:1
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-normal) ease-(--motion-ease-out)",
            zone === "error" && "bg-destructive",
            zone === "warn" && "bg-amber-500",
            zone === "clean" && "bg-emerald-500",
          )}
          style={{ width: `${meterPercent(ratio)}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${failPct}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${warnPct}%` }}
        />
      </div>
      <div className="relative h-3 w-full font-mono text-[9px] text-muted-foreground/70">
        <span className="absolute -translate-x-1/2" style={{ left: `${failPct}%` }}>
          {CONTRAST_ERROR_MIN}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${warnPct}%` }}>
          {CONTRAST_WARN_MIN}
        </span>
      </div>
    </div>
  );
}
