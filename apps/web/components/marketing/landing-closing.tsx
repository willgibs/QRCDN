import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { PrintCodeDefs, definePrintCode } from "@/components/marketing/print-mat";

/**
 * The landing's closing (P9.10-D7). Board-approved at the R2 review:
 * "CTA looks good for production."
 *
 * It is a SEPARATE component from `ClosingSection`, which is shared by all
 * four feature pages and keeps rendering exactly as it did. The landing
 * earns a composition of its own because it is the only page whose ending
 * carries the aurora budget's closing placement; forking the shared
 * component to get that would have restyled four pages nobody asked about.
 * Same reasoning as the D5 RetargetPlate / RetargetStage split.
 *
 * Three things distinguish it, all three board notes from the R2 review:
 *
 * 1. **The field.** A glow and six drifting codes behind the ask, so the
 *    last screen is not an empty box with a button in it. The reference
 *    was Cosmos: dim objects adrift in the dark, loosely ringing one
 *    button. Ours are printed codes, so the page ends the way it opens —
 *    the hero deals three mats out of a stack, the closing has them still
 *    floating.
 *
 * 2. **The button matches the hero.** `.cta-kiss` composes `.aurora-edge`
 *    AND `.aurora-breathe`, so both ends of the page run one animation
 *    list including the hero's 4.5s breath.
 *
 * 3. **The heading breaks evenly at md and up.** Two spans, inline on
 *    small screens where natural wrap is correct for a narrow measure,
 *    blocks at md so it reads "Create your first / code in minutes"
 *    instead of the ragged last line the balanced wrap produced. The same
 *    device the hero h1 uses for "The modern / QR platform".
 *
 * `divider="none"`: today's closing carries the landing's ONE hairline
 * because it follows the pricing teaser on the same surface, and that
 * hairline is the redundant kind by the Section system's own rule. 13 now
 * ends on a full-length row, so the seam has nothing left to separate.
 */

/**
 * The field's codes are the "field" render (light ink on dark), the
 * variant D6.1 added for the open-source strip. Dim, soft-edged,
 * uncaptioned and off-centre ON PURPOSE: a code a reader tries to scan
 * and cannot is worse than no code at all, so the opacity ceiling is 0.13
 * and every one of them is blurred. Nothing here should read as an
 * invitation. Same reasoning D6.1 wrote down for the module field,
 * applied to whole symbols instead of a bled-out patch.
 *
 * Placement avoids the centre column so nothing sits behind the heading
 * or the pill.
 */
const FIELD_CODES = [
  definePrintCode("HTTPS://QRCDN.COM/POSTER", "cf-poster", "field"),
  definePrintCode("HTTPS://QRCDN.COM/SHOP", "cf-shop", "field"),
  definePrintCode("HTTPS://QRCDN.COM/CARD", "cf-card", "field"),
];

/** x/y are percentages of the section box; w is a rem width. Periods are
 *  coprime-ish so the six never re-sync into a visible pulse, the same
 *  trick the hero's paper floats and D4's aurora pockets use. */
const FIELD_MATS = [
  { code: 0, x: "7%", y: "18%", w: "8.5rem", o: 0.13, r: "-9deg", b: "0.4px", t: "11s", d: "0s" },
  { code: 1, x: "20%", y: "63%", w: "6rem", o: 0.09, r: "7deg", b: "0.8px", t: "13s", d: "-3s" },
  { code: 2, x: "78%", y: "14%", w: "6.75rem", o: 0.11, r: "12deg", b: "0.6px", t: "12s", d: "-6s" },
  { code: 0, x: "87%", y: "58%", w: "9.5rem", o: 0.1, r: "-5deg", b: "0.5px", t: "15s", d: "-2s" },
  { code: 1, x: "63%", y: "82%", w: "5.25rem", o: 0.07, r: "-14deg", b: "1px", t: "14s", d: "-8s" },
  { code: 2, x: "31%", y: "4%", w: "5rem", o: 0.075, r: "4deg", b: "1px", t: "16s", d: "-5s" },
] as const;

function ClosingField() {
  return (
    <div aria-hidden className="closing-field">
      <PrintCodeDefs codes={FIELD_CODES} />
      <div className="closing-glow" />
      {FIELD_MATS.map((mat, i) => {
        const code = FIELD_CODES[mat.code];
        return (
          <svg
            key={i}
            viewBox={code.viewBox}
            className="closing-mat"
            style={
              {
                "--cm-x": mat.x,
                "--cm-y": mat.y,
                "--cm-w": mat.w,
                "--cm-o": mat.o,
                "--cm-r": mat.r,
                "--cm-b": mat.b,
                "--cm-t": mat.t,
                "--cm-d": mat.d,
              } as React.CSSProperties
            }
          >
            <use href={`#${code.id}`} />
          </svg>
        );
      })}
    </div>
  );
}

export function LandingClosing({
  title = (
    <>
      <span className="md:block">Create your first</span>{" "}
      <span className="md:block">code in minutes</span>
    </>
  ),
  lede = "Start free. No card, no trial clock.",
}: {
  title?: ReactNode;
  lede?: string;
} = {}) {
  return (
    <Section variant="centered" rhythm="air" divider="none" className="overflow-hidden">
      <ClosingField />

      {/* `relative` lifts the content above the field rather than pushing
          the field back with a negative z-index — the D6.1 lesson, where
          `-z-10` inside an `isolate` context put the module field behind
          its own card's background and made it invisible on production. */}
      <div className="relative">
        <SectionHeading titleAs="h2" title={title} lede={lede} titleSize="h2-lg" />

        <SectionBody delay={0.15} className="mt-8 flex flex-col items-center gap-5">
          {/* The white halo this button used to carry was
              `shadow-primary/25`, authored in the violet era and rendering
              WHITE on WHITE since the monochrome amendment. The halo stays
              and becomes the aurora: same place, correct colour. Kept on
              the site's white pill rather than restyled as a dark
              aurora-ringed button like the hero input, because "Start
              free" is one idiom across five pages (feature-hero.tsx says
              so explicitly) and changing the landing's copy of it would
              fork the set. The kiss is added around the idiom, not
              instead of it. */}
          <Button
            asChild
            size="lg"
            className="cta-kiss aurora-edge aurora-breathe h-12 rounded-full px-7 text-base"
          >
            <Link href="/login">Start free</Link>
          </Button>
          <p className="font-mono text-xs text-muted-foreground">your code never dies</p>
        </SectionBody>
      </div>
    </Section>
  );
}
