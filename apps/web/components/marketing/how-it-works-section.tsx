import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { HowItWorksGrid } from "@/components/marketing/how-it-works-grid";

/**
 * 01 — How it works (P9.7-U2, rebuilt as the filmstrip; was P9.5-T3a's
 * three-identical-ModuleMark-tiles grid). Board-approved reference:
 * `scratchpad/p97-composition-gate.html`'s "01 How it works" treatment —
 * translated into real components, not redesigned. This is the pilot
 * section for the whole P9.7 composition system: the first section after
 * the hero, the only one with no id anchor and no feature page reusing it,
 * so it is the safest place to judge the new register on production.
 *
 * The call today is `variant="band"` with `surface="tint"` (band forces
 * `divider="none"` — its own full-bleed plate against the neighbors is the
 * seam). Round 1 also carried `frame="bleed"` and a raised `titleSize`;
 * round 2 reverted both, as recorded below.
 *
 * P9.10-D4 promoted this section from 02 to 01 and gave it the tint plate.
 * The promotion is the reason for the surface: at 02 this band sat between
 * a tint bento and a floor showcase, so `default` was itself the change.
 * At 01 its neighbor above is the hero, which is also `default`, and band
 * suppresses the hairline — so promoted unchanged there would be no seam at
 * all between the hero and the page's first section. Tint is the plate the
 * bento vacated, which keeps the run default → tint → default → floor.
 *
 * BOARD REVIEW, two rounds. Round 1: the stations bled to the viewport edge
 * while the heading sat on the page measure (two left edges in one section),
 * the heading was too quiet, and the artwork was too small to carry a band.
 *
 * ROUND 2 settled the shape, and reversed two of my round-1 answers:
 *
 * 1. `frame` drops back to the default `page`. Bleeding the rule was the
 *    whole reason for `frame="bleed"`, and measurement showed the rule was
 *    geometrically perfect (full viewport, every tile bottoming exactly on
 *    it) while still reading as broken: a hairline spanning 1440px with the
 *    content clustered in the middle 1088 is a line ACROSS the section, not
 *    a baseline UNDER it. The rule now spans the same measure as everything
 *    else. The bleed experiment did not earn its keep.
 * 2. `titleSize` drops back to the default `h2`. I over-corrected from h3 to
 *    h1; the board's call is the established h2, so 01 sits in the same
 *    register as every other section and the hero keeps the only display
 *    size on the page.
 * 3. Heading copy is new. "Three steps, then it's printed." was accurate but
 *    clipped, and it described a printing sequence the three steps no longer
 *    describe. "Set it up once. Change it whenever." states the payoff in
 *    plain speech and sets up Design / Create / Update beneath it.
 *
 * The step titles are the board's own wording. Nothing in
 * `e2e/marketing.spec.ts` asserts on this section's copy (grep-checked
 * before each change, not assumed).
 */
export function HowItWorksSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section variant="band" surface="tint">
      <SectionHeading
        eyebrow="How it works"
        index={index}
        title="Create codes that work forever"
        titleSize={titleSize}
      />

      <SectionBody>
        {/* P9.10-D9: the filmstrip retired for the numbered 2x2 grid —
            same four concepts and copy, each on a card of its own with
            one hover microanimation. See how-it-works-grid.tsx. */}
        <HowItWorksGrid />
      </SectionBody>
    </Section>
  );
}
