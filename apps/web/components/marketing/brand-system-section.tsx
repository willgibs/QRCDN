import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { BRAND_STUDIO_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { KitContactSheet } from "./kit-contact-sheet";

// 03 — Brand system (P9.5-T3a: migrated onto Section/SectionHeading, copy
// deck v3 head/lede/mono strip applied). P9.5-T3b: body replaced — the old
// `StudioWindow` kit-window mock read as a second builder (the board's
// exact note), so it's retired (zero other importers, grep-verified) in
// favor of `KitContactSheet`: one kit style rendered across several
// real-world print artifacts, saying "set once, appears everywhere"
// instead of showing another editor. Mono strip cites D5 (style frozen per
// code at mint) — see docs/DECISIONS.md.
//
// P9.5-T-F2: gained `id="brand-system"` — every other Section on the
// landing that carries a doorway link already has one (#studio,
// #dynamic-codes, #analytics, #api, #open-source); this was the one
// omission, harmless while its own doorway stayed off but worth closing
// now that BRAND_STUDIO_DOORWAY_ENABLED flips true here too (this is the
// SECOND of its two call sites, alongside playground.tsx's #studio) —
// gives e2e (and any future in-page link) a stable anchor to scope to,
// same as every sibling section.
export function BrandSystemSection({ index }: { index: string }) {
  return (
    <Section id="brand-system" variant="split" divider="none">
      <SectionHeading
        eyebrow="Brand system"
        index={index}
        title="Every code starts from your kit."
        lede="Ink, paper, shapes, logo: set once as a kit. Every code you make starts from it, from menu tents to ticket stubs."
        className="mb-10"
      />

      <SectionBody className="max-w-5xl">
        <KitContactSheet />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-4">
        <MonoStrip>style frozen per code at mint · re-renders identical forever</MonoStrip>
        {BRAND_STUDIO_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/brand-studio">Explore the brand studio</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
