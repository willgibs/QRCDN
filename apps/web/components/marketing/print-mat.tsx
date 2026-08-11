import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "@/lib/brand-qr";
import { cn } from "@/lib/utils";

/**
 * The printed code, as a primitive (P9.10-D5).
 *
 * A printed code became a real, specific object on this site at D1 (the
 * hero's floating mats) and again at D4 (the filmstrip's stations, once the
 * white-on-dark tiles were caught contradicting the ink swatch printed under
 * them). Section 05 needed a third, which is the moment to stop rebuilding
 * it: ink on white paper, a real engine render, floating on shadow. Hierarchy
 * comes from DEPTH, never from hue — the D4 ruling, after the filmstrip's
 * "accent" bloom turned out to be an authored violet that the monochrome
 * amendment had quietly repainted white.
 *
 * **The hero's mats are deliberately not folded in here.** They carry the D1
 * load choreography and their pose classes (`hero-mat-1..3`, the fan spring,
 * the float periods), and pulling a proven entrance sequence through a new
 * abstraction would risk it for no visual gain. Two implementations is the
 * right number: this one for codes that sit still, the hero's for the ones
 * that are dealt.
 *
 * Defaults are chosen to reproduce `filmstrip.tsx`'s `QrNode` exactly, so its
 * adoption is a refactor with no visual delta (proven by capture parity at
 * the D5 build, not asserted): 8.3% padding, a flat 14px radius at every
 * size, and the same two shadow tiers.
 *
 * Rendering follows the `<symbol>`/`<use>` idiom `filmstrip.tsx` documents at
 * length: `definePrintCode` runs the engine ONCE per payload, `PrintCodeDefs`
 * emits the symbols, and every mat is a `<use>` reference. That is what makes
 * "the same code, unchanged" true in the markup rather than merely asserted
 * in a sentence — which is exactly the claim section 05 exists to make.
 */

export type PrintCode = { id: string; viewBox: string; inner: string };

const SVG_SHAPE_RE = /^<svg[^>]*\sviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/;

/**
 * Run the engine once for `data` and extract its shape into a `<symbol>`
 * payload. Always the LIGHT style: paper has no dark mode, so there is no
 * second render to toggle between (the dark half of the old light/dark pair
 * retired with the filmstrip's screen tiles at D4).
 *
 * The regex is guarded the same way the filmstrip's was: if the engine's
 * output shape ever changes underneath this, it throws at module load — a
 * loud build-time failure rather than silently broken markup.
 */
export function definePrintCode(
  data: string,
  id: string,
  /**
   * `"paper"` (the default) is dark ink for a white mat, which is the only
   * thing a PrintMat should ever hold. `"field"` renders the light-ink pair
   * instead, and exists for ONE use: ambient module-field texture on a dark
   * ground (P9.10-D6.1's open-source strip). It is not a mat and must never
   * be handed to `PrintMat` — a light-ink code on white paper would not
   * scan, which is exactly the class of mistake the QR solidity rule is
   * there to prevent.
   *
   * The distinction is load-bearing because `renderQr` BAKES the fill into
   * the path attributes: a `text-*` utility on the consuming element does
   * nothing, so getting this wrong renders a code that is present in the DOM
   * and invisible on screen, which is how the first draft of that strip
   * shipped near-black ink onto a near-black card.
   */
  variant: "paper" | "field" = "paper",
): PrintCode {
  const style =
    variant === "field" ? brandQrStyles.precision.dark : brandQrStyles.precision.light;
  const svg = renderQr({ data, style }).svg;
  const match = svg.match(SVG_SHAPE_RE);
  if (!match) {
    throw new Error(
      `print-mat.tsx: renderQr's output no longer matches the expected ` +
        `<svg viewBox="...">...</svg> shape (code "${id}"): the extraction ` +
        `regex needs updating to match the new format.`,
    );
  }
  return { id, viewBox: match[1], inner: match[2] };
}

/** Emits the shared symbol definitions. Zero visual footprint; render once
 *  per surface, above the mats that reference it. */
export function PrintCodeDefs({ codes }: { codes: readonly PrintCode[] }) {
  return (
    <svg aria-hidden className="absolute size-0">
      {codes.map((code) => (
        <symbol
          key={code.id}
          id={code.id}
          viewBox={code.viewBox}
          dangerouslySetInnerHTML={{ __html: code.inner }}
        />
      ))}
    </svg>
  );
}

/** Depth, not hue. `raised` is the featured object of its stage; `rest` is
 *  an ordinary one. Anything beyond two tiers stops reading as hierarchy. */
const DEPTH = {
  rest: "shadow-[0_1px_0_var(--border),0_12px_28px_-20px_rgb(0_0_0/0.55)]",
  raised: "shadow-[0_1px_0_var(--border),0_26px_54px_-24px_rgb(0_0_0/0.78)]",
} as const;

export function PrintMat({
  code,
  size,
  depth = "rest",
  radius = 14,
  className,
}: {
  code: PrintCode;
  /** Paper size in px, square. The engine render fills it minus the margin. */
  size: number;
  depth?: keyof typeof DEPTH;
  /** Flat by default so the filmstrip's three sizes stay byte-identical to
   *  what they rendered before adoption. Scale it up for large paper, where
   *  14px on a 260px mat reads as a sharp corner. */
  radius?: number;
  className?: string;
}) {
  // Presentational margin only. `renderQr` already bakes the real D6 quiet
  // zone into its own output, so this number carries no decode risk.
  const pad = Math.round(size * 0.083);
  return (
    <div
      className={cn("shrink-0 bg-white", DEPTH[depth], className)}
      style={{ width: size, height: size, padding: pad, borderRadius: radius }}
    >
      <svg viewBox={code.viewBox} aria-hidden className="block h-full w-full">
        <use href={`#${code.id}`} />
      </svg>
    </div>
  );
}
