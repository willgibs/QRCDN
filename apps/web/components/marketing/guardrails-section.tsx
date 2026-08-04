import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { Note } from "@/components/marketing/note";
import { ScannabilityFigure } from "./scannability-figure";

/**
 * 08 — Scannability (was "Guardrails" through P9.7-V1; the file name is
 * corrected at V8 rather than mid-round, to keep this diff about the section).
 *
 * P9.7-V5 rebuilt the body and retired an overclaim that had been shipping
 * since P9.5. The old lede ended "when the instrument says scannable, it means
 * their camera and your printer, not just our math." We have never tested a
 * phone or a sheet of paper. The evidence is 160+ style combinations rendered
 * to PNG and decoded by zxing, which is a software round-trip;
 * `docs/deferred-verification.md` entry 8 has recorded physical print-and-scan
 * as unproven the whole time. The same sentence closed the blog post and is
 * retired there in the same commit.
 *
 * What replaces it is stronger anyway, and true: our thresholds sit BELOW the
 * worst configuration that still decoded. See scannability-figure.tsx.
 */
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

      <SectionBody>
        <ScannabilityFigure />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-start gap-5">
        <Note lead="Measured by a decoder, not by a camera.">
          Those campaigns rendered each style to an image and decoded it with zxing, the library
          most scanning apps are built on. That is a real test and it is not the same as a phone
          reading a printed sheet under a shop light, so the thresholds are set conservatively and
          we say which kind of test they came from.
        </Note>
        <MonoStrip>
          160+ style combinations · 2 adversarial decode campaigns · warn 0.395 · fail 0.412
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
