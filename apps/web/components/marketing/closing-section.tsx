import type { ComponentProps } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";

/**
 * Closing (P9.5-T3a, rebuilt per copy deck v3's CLOSING block). No
 * eyebrow, no ordinal — the deck's voice rules carry hero and closing with
 * neither, the same bookend treatment. `variant="centered"` (well under
 * the design system's "≤3 per page" budget: the only other centered use
 * this unit is none — how-it-works/studio/brand/dynamic/analytics/api/
 * pricing are all stack/split/showcase) plus `rhythm="air"` per the IA
 * mapping. Divider stays the Section default (hairline): the pricing
 * teaser immediately above is also `surface="default"`, so same-surface
 * neighbors get the hairline seam per the Section system's own rule.
 *
 * `title`/`lede` (P9.5-T-F1, additive — the landing's own `<ClosingSection
 * />` call omits both and keeps today's byte-identical copy): the
 * dynamic-codes feature-page deck's own closing CTA head ("Print something
 * that can change its mind.") is verbatim identical to this section's
 * existing landing copy, so that page reuses this component with zero
 * props at all. The analytics feature page's closing head differs ("Know
 * what your print is doing."), so it overrides `title` only — `lede`, the
 * button, and the mono sign-off stay the same evergreen, page-agnostic
 * copy everywhere this component is used, true reuse rather than a forked
 * per-page copy.
 */
export function ClosingSection({
  title = "Print something that can change its mind.",
  lede = "Start free. No card, no trial clock.",
  titleSize,
}: {
  title?: string;
  lede?: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
} = {}) {
  return (
    <Section variant="centered" rhythm="air">
      <SectionHeading titleAs="h2" title={title} lede={lede} titleSize={titleSize} />

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-center gap-5">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25"
        >
          <Link href="/login">Start free</Link>
        </Button>
        <p className="font-mono text-xs text-muted-foreground">your code never dies</p>
      </SectionBody>
    </Section>
  );
}
