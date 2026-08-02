import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { Filmstrip } from "@/components/marketing/filmstrip";

/**
 * 01 — How it works (P9.7-U2, rebuilt as the filmstrip; was P9.5-T3a's
 * three-identical-ModuleMark-tiles grid). Board-approved reference:
 * `scratchpad/p97-composition-gate.html`'s "01 How it works" treatment —
 * translated into real components, not redesigned. This is the pilot
 * section for the whole P9.7 composition system: the first section after
 * the hero, the only one with no id anchor and no feature page reusing it,
 * so it is the safest place to judge the new register on production.
 *
 * `variant="band"` (still forces `divider="none"` — its own surface change
 * against the hero above and the playground/floor section below is the
 * seam) + `surface="tint"` (unchanged) + `frame="bleed"` (no gutter at all,
 * so the filmstrip's baseline rule can span the full viewport width) +
 * `rhythm="standard"`.
 *
 * BOARD REVIEW ROUND 1 corrected three things in the first pass, all mine:
 *
 * 1. `frame="bleed"` was taken as licence for the STATIONS to bleed too, so
 *    the station labels and copy ran to the viewport edge while the heading
 *    above them sat on the page measure. Two different left edges in one
 *    section reads as broken, because it is. Only the RULE bleeds now; every
 *    piece of content in here shares `max-w-page px-gutter` with the
 *    heading. That is also what makes the three stations sit close enough
 *    together to read as one filmstrip rather than three islands.
 * 2. `titleSize="h3"` was too quiet for the first section after the hero.
 *    Now `titleSize="h1"` on a `titleAs="h2"` tag (P9.7-U1 decoupled size
 *    from semantics precisely so this is reachable without a second page
 *    `<h1>`). The page's heading hierarchy is now hero `display` -> 01 `h1`
 *    -> every other section `h2`, which is a real ladder rather than the 23
 *    identical headings this round exists to fix.
 * 3. The artwork was too small to carry a full-width band: an 84px code and
 *    ~50px print artifacts read as specks on a 1440px field. Every object in
 *    `filmstrip.tsx` is scaled up substantially.
 *
 * Eyebrow/index/title copy is byte-identical to what shipped before this
 * unit; nothing in `e2e/marketing.spec.ts` asserts on it (checked by grep).
 */
export function HowItWorksSection() {
  return (
    <Section variant="band" surface="tint" frame="bleed">
      <div className="mx-auto w-full max-w-page px-gutter">
        <SectionHeading
          eyebrow="How it works"
          index="01"
          title="Three steps, then it's printed."
          titleAs="h2"
          titleSize="h1"
        />
      </div>

      <SectionBody>
        <Filmstrip />
      </SectionBody>
    </Section>
  );
}
