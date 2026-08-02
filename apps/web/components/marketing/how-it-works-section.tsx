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
 * seam) + `surface="tint"` (unchanged) + `frame="bleed"` (new: no gutter at
 * all, so the filmstrip's baseline rule can span the full viewport width;
 * the heading and the closing caption each re-establish their own
 * `max-w-page` measure below) + `rhythm="tight"` (new: 01 is the contract
 * slide, it goes quiet and lets the diagram carry the section).
 *
 * `titleSize="h3"` on a `titleAs="h2"` heading is deliberate (P9.7-U1's
 * decoupled size/semantics) — the first real use of the smaller scale.
 * Eyebrow/index/title copy is byte-identical to what shipped before this
 * unit; nothing in `e2e/marketing.spec.ts` currently asserts on it (checked
 * by grep, not assumed — the build spec's own instruction to verify before
 * touching anything near it), so there was no locator to preserve here.
 */
export function HowItWorksSection() {
  return (
    <Section variant="band" surface="tint" frame="bleed" rhythm="tight">
      <div className="mx-auto w-full max-w-page px-gutter">
        <SectionHeading
          eyebrow="How it works"
          index="01"
          title="Three steps, then it's printed."
          titleAs="h2"
          titleSize="h3"
        />
      </div>

      <SectionBody>
        <Filmstrip />
      </SectionBody>
    </Section>
  );
}
