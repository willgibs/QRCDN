import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { definePrintCode, PrintCodeDefs } from "@/components/marketing/print-mat";

/**
 * 12 — Lifetime guarantees, on the paper band (P9.10-D6).
 *
 * The page had no light moment in fourteen sections, and the one loud surface
 * it owned did not read as loud: `design-system.md` already conceded that on
 * a dark page the ink plate is a subtle deepening, which is exactly why the
 * same note names the paper plate "the loud surface move." This section was
 * carrying the page's one Loud heading on a plate that barely registered as
 * a plate. It is now the sheet of print the whole landing has been arguing
 * about, and `surface="ink"` retired with the move — 12 was its only
 * consumer anywhere on the site.
 *
 * Board pick at the D6 R1 review: register B, the printed guarantee. The
 * commitments are a schedule rather than a centred stack of sentences —
 * numbered, ruled, claim left and citation right — because a warranty is a
 * document and a slide is not. Register A (today's composition, re-dressed)
 * proved the surface alone carries it but left the boxed `MonoStrip` sitting
 * on the sheet as the one element still looking like software rather than
 * print, which is why the infra line demotes to fine print along the foot.
 * Register C's honest badge stamps were banked at the board's call, for
 * /pricing or the feature pages where a reader is already comparing.
 *
 * Copy rewritten in the same review ("rewrite the 3 policies to sound more
 * natural, can be different entirely"). Every one still resolves to the same
 * citable fact it did as policy language; the citations are unchanged and
 * still point at where a reader can check.
 */

const COMMITMENTS = [
  { claim: "We never switch off a free code.", cite: "pricing policy, in the terms" },
  { claim: "Stop paying and your codes go read-only, never dark.", cite: "D14, in the terms" },
  {
    claim: "If our site goes down, your codes keep redirecting.",
    cite: "architecture, in the open",
  },
] as const;

const INFRA =
  "302 + no-store, never 301 · KV in front of Postgres · retarget propagates instantly, ≤ 5 min worst case · raw IPs never stored";

/**
 * The code printed on the sheet encodes `/terms`, which is where two of the
 * three citations already send you. A real destination, on the one section
 * whose whole subject is whether we can be taken at our word.
 *
 * Rendered BARE rather than through `PrintMat`: that primitive is a white
 * paper mat, and a white mat on a paper plate is a card lying on a sheet.
 * Here the sheet IS the paper, so the engine's ink paths sit straight on it
 * (`renderQr` emits no background path, so the plate shows through the quiet
 * zone).
 *
 * SIZED FROM THE MODULE COUNT, then verified by decode. This payload renders
 * a 33-module viewBox (a 25x25 version-2 symbol plus the engine's 4-module
 * quiet zone each side). The R1 draft drew it at 64px, which is 1.94px per
 * module — a code captioned "scan for the terms" that no phone would read,
 * which on a trust section is worse than no code at all. 128px is 3.88px per
 * module, and at that size a screenshot of what the browser actually paints
 * reads back as `HTTPS://WWW.QRCDN.COM/TERMS` through the same zxing reader
 * `packages/qr-engine/test/decode.test.ts` uses. If the payload changes,
 * re-derive the size from the new viewBox rather than keeping this number.
 */
const TERMS_CODE = definePrintCode("HTTPS://WWW.QRCDN.COM/TERMS", "terms-code");
const TERMS_MODULES = Number(TERMS_CODE.viewBox.split(" ")[2]);
const MIN_PX_PER_MODULE = 3.8;
const TERMS_SIZE = Math.ceil((TERMS_MODULES * MIN_PX_PER_MODULE) / 4) * 4;

export function ManifestoSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section variant="centered" surface="paper" rhythm="air">
      <SectionHeading
        eyebrow="Trust & privacy"
        index={index}
        title="Lifetime guarantees"
        titleSize={titleSize}
        tone="paper"
      />

      <SectionBody delay={0.15} className="mt-10 flex flex-col gap-10">
        <PrintCodeDefs codes={[TERMS_CODE]} />

        {/* The rules are `--paper-rule` (decorative, WCAG 1.4.11-exempt at
            1.35:1), never `--paper-border`, which is reserved for edges that
            have to be identifiable and clears 3:1. The D6 audit split those
            two apart precisely so this call site does not have to choose
            between a visible hairline and a passing one. */}
        <ol className="mx-auto w-full max-w-3xl border-t border-paper-rule">
          {COMMITMENTS.map((commitment, i) => (
            <li
              key={commitment.claim}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-paper-rule py-5 text-left"
            >
              <span className="font-mono text-[11px] tabular-nums text-paper-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 text-[1.0625rem] leading-snug text-paper-foreground">
                {commitment.claim}
              </span>
              <span className="font-mono text-[11px] text-paper-muted">{commitment.cite}</span>
            </li>
          ))}
        </ol>

        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-6 pt-2 sm:flex-nowrap sm:justify-between sm:text-left">
          <p className="max-w-[46ch] font-mono text-[11px] leading-relaxed text-paper-muted">
            {INFRA}
          </p>
          <div className="flex shrink-0 flex-col items-center gap-2">
            <svg
              viewBox={TERMS_CODE.viewBox}
              aria-hidden
              className="block text-paper-foreground"
              style={{ width: TERMS_SIZE, height: TERMS_SIZE }}
            >
              <use href={`#${TERMS_CODE.id}`} />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.08em] text-paper-muted uppercase">
              scan for the terms
            </span>
          </div>
        </div>
      </SectionBody>
    </Section>
  );
}
