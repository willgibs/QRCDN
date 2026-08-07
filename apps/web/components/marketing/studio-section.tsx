import type { ComponentProps } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { StudioDials } from "./studio-dials";

// 03 — Design studio (P9.9-C2 restage). The full anonymous Playground left
// the landing this round (it lives whole on /features/brand-studio): since
// P9.8-B4 the public /studio is the real free generator, and the landing's
// job shrank to a taste plus the page's most direct doorway into it. The
// body is StudioDials, the board's merged pick from the C2 exploration
// artifact: live engine dials converging a floating four-mat wall.
//
// `id="studio"` is the highlights bento's anchor target (e2e asserts it
// resolves): it must survive every redesign, same rule as #brand-system.
// The /features/brand-studio doorway now lives ONLY on section 04; this
// section's close is the /studio CTA, carrying the real page promise
// (free, no account, no watermark — /studio's own metadata).
export function StudioSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="studio" variant="showcase" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Design studio"
        index={index}
        title="Design one right now"
        lede="The real engine, three dials: turn one and the whole wall follows. Payloads, logo knockout, and the scannability instrument wait in the studio, free."
        titleSize={titleSize}
        className="mb-10"
      />
      <SectionBody>
        <StudioDials />
      </SectionBody>
      <SectionBody delay={0.15} className="mt-10 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className="rounded-full px-6 shadow-lg shadow-primary/25">
          <Link href="/studio">Open the studio</Link>
        </Button>
        <p className="font-mono text-xs text-muted-foreground">
          free · no account · no watermark
        </p>
      </SectionBody>
    </Section>
  );
}
