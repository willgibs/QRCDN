import { GLYPH_CHAR, type ComparisonGlyph } from "@/lib/comparison";
import { cn } from "@/lib/utils";

/**
 * The comparison verdict chip (P9.9-C3), shared by section 10's landing
 * matrix and /pricing#compare's full sheet so the two surfaces cannot
 * drift. Server-only, zero client JS.
 *
 * Tone system, re-toned at P9.10-D3 (the C3 original was built as
 * violet-vs-neutral; the D13 monochrome amendment collapsed that into an
 * opacity ladder of one near-white, so the grading premise moved from
 * hue to STRUCTURE): the FILLED chip in a lead row's QRCDN cell is the
 * bench's one deliberate white (bg-primary IS the ink-white CTA token —
 * white-budget classed); our parity answers carry the lit-stroke
 * hairline instead of a wash, so they still grade below the filled chip
 * without borrowing its material; the gap row's enterprise cell keeps
 * the neutral fill (the marking is symmetric, the material is not);
 * field cells stay quiet alpha steps. Yes-verdicts carry the semantic
 * green (`--ok`) — the board-picked posture B at the D3 review
 * (2026-08-09): semantic color stays, "adds a bit of life to the UI."
 */

export type ChipTone = "lead" | "qrcdn" | "gaplead" | "field";

export function chipClass(glyph: ComparisonGlyph, tone: ChipTone): string {
  if (tone === "lead") return "bg-primary text-primary-foreground";
  if (tone === "gaplead") return "bg-foreground/20 text-foreground";
  if (tone === "qrcdn") {
    return glyph === "yes"
      ? "lit-stroke bg-white/[0.04] text-(--ok)"
      : "bg-foreground/[0.07] text-foreground/45";
  }
  if (glyph === "yes") return "bg-foreground/[0.09] text-(--ok)";
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
