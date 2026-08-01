import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { FEATURE_DOORWAYS_ENABLED } from "@/lib/marketing-flags";
import { StudioWindow } from "./studio-window";

// 03 — Brand system (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strip applied). Body (StudioWindow) unchanged
// this chunk. Mono strip cites D5 (style frozen per code at mint) — see
// docs/DECISIONS.md.
export function BrandSystemSection() {
  return (
    <Section variant="split" divider="none">
      <SectionHeading
        eyebrow="Brand system"
        index="03"
        title="One kit. Every code on-brand."
        lede="Ink, paper, shapes, logo: set once as a kit. Every code you mint inherits it, from menu tents to ticket stubs."
        className="mb-10"
      />

      <SectionBody className="max-w-5xl">
        <StudioWindow />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-4">
        <MonoStrip>style frozen per code at mint · re-renders identical forever</MonoStrip>
        {FEATURE_DOORWAYS_ENABLED && (
          <LearnMoreLink href="/features/brand-studio">Explore the brand studio</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
