import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { CodeBlock } from "@/components/marketing/code-block";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { readGuardrailsExcerpt } from "@/lib/guardrails-excerpt";

const REPO_URL = "https://github.com/willgibs/QRCDN";

// 09 — Built in the open (P9.5-T3c, new section, id="open-source" — the
// hero pillar strip's "open source" chip anchors here now instead of
// linking straight out to the repo). The visual is a real, build-time
// excerpt of packages/qr-engine/src/guardrails.ts's threshold constants
// (lib/guardrails-excerpt.ts reads the file off disk and slices it by
// content anchor) — never a hand-typed copy that could drift from the
// actual source.
export function OpenSourceSection({ index }: { index: string }) {
  const excerpt = readGuardrailsExcerpt();

  return (
    <Section id="open-source" variant="split" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Open source"
        index={index}
        title="Verify our platform yourself."
        lede="The engine, the redirect worker, this site: MIT-licensed and public. Audit the privacy claims yourself. If we ever disappear, the path off is public. That's the point."
        className="mb-10"
      />

      <SectionBody className="max-w-3xl">
        <CodeBlock code={excerpt} lang="typescript" title="packages/qr-engine/src/guardrails.ts" />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-4">
        <MonoStrip>MIT · github.com/willgibs/QRCDN · disclosure: hello@qrcdn.com</MonoStrip>
        <LearnMoreLink href={REPO_URL} external>
          View the repo
        </LearnMoreLink>
      </SectionBody>
    </Section>
  );
}
