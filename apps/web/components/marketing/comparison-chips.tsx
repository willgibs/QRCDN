import { GLYPH_CHAR, type ComparisonGlyph } from "@/lib/comparison";
import { cn } from "@/lib/utils";

/**
 * The comparison verdict chip (P9.9-C3), shared by section 10's landing
 * matrix and /pricing#compare's full sheet so the two surfaces cannot
 * drift. Server-only, zero client JS.
 *
 * Tone system (the badge-less marking the board picked): a FILLED primary
 * chip appears only in the QRCDN cell of a lead row; our parity answers
 * keep a quiet primary outline so the filled chip still grades. The gap
 * row's enterprise cell gets the filled treatment in NEUTRAL: the marking
 * is symmetric, the accent is not.
 */

export type ChipTone = "lead" | "qrcdn" | "gaplead" | "field";

export function chipClass(glyph: ComparisonGlyph, tone: ChipTone): string {
  if (tone === "lead") return "bg-primary text-primary-foreground";
  if (tone === "gaplead") return "bg-foreground/20 text-foreground";
  if (tone === "qrcdn") {
    return glyph === "yes" ? "bg-primary/15 text-primary" : "bg-foreground/[0.07] text-foreground/45";
  }
  if (glyph === "yes") return "bg-primary/10 text-primary/80";
  if (glyph === "partial") return "bg-foreground/[0.07] text-foreground/60";
  return "bg-foreground/[0.07] text-foreground/40";
}

export function GlyphChip({ glyph, tone }: { glyph: ComparisonGlyph; tone: ChipTone }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 flex-none items-center justify-center rounded-full text-[0.6rem] font-bold",
        chipClass(glyph, tone),
      )}
    >
      {GLYPH_CHAR[glyph]}
    </span>
  );
}
