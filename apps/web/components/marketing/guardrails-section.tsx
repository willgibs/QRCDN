import { LOGO_EFFECTIVE_ERROR, LOGO_EFFECTIVE_WARN } from "@qrcdn/qr-engine";
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
 * What replaces it is stronger anyway, and true — stated precisely, because
 * the two thresholds relate to the campaign differently: warn (0.395) sits
 * BELOW the best pass ever observed (~0.407); fail (0.412) sits INSIDE the
 * gap between that and the worst fail (~0.418), where nothing was observed
 * at all. See scannability-figure.tsx, whose header records the earlier
 * draft that flattened these into one claim.
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
        {/* Interpolated from the engine, never retyped — this strip, the gauge
            and the instrument panel are three surfaces reading one pair of
            constants (the e2e comment asserting that used to be false: this
            strip was a hardcoded literal until the P9.7 close-out review). */}
        <MonoStrip>
          {`160+ style combinations · 2 adversarial decode campaigns · warn ${LOGO_EFFECTIVE_WARN} · fail ${LOGO_EFFECTIVE_ERROR}`}
        </MonoStrip>
      </SectionBody>
    </Section>
  );
}
