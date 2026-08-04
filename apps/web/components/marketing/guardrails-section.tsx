import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { GuardrailsPlot } from "./guardrails-plot";

// 05 — Guardrails (P9.5-T3c, new section). Sits between 04 dynamic-codes
// (surface="tint") and 06 analytics (surface="floor") — surface="default"
// here matches how 03 brand-system already sits as the neutral pause
// between two colored neighbors (02 floor, 04 tint); divider="none" on both
// sides since neither neighbor shares this surface (Section's own
// hairline-only-between-same-surface rule).
export function GuardrailsSection({ index }: { index: string }) {
  return (
    <Section variant="split" divider="none">
      <SectionHeading
        eyebrow="Scannability"
        index={index}
        title="Know it scans before you print it."
        lede="The studio checks contrast, module shape and logo coverage as you design. Its limits are not guesswork: they are calibrated against real decode campaigns, and set below the point where anything actually failed."
        className="mb-10"
      />

      <SectionBody className="max-w-4xl">
        <GuardrailsPlot />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-3">
        <MonoStrip>
          160+ style combinations · 2 adversarial decode campaigns · warn 0.395 · fail 0.412
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
