import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { BRAND_STUDIO_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { KitSyncTheatre } from "./kit-sync-theatre";

// 04 — Brand system. P9.5-T3b's `KitContactSheet` body retired at P9.9-C1
// (board pick from the C1 exploration artifact: "B, the sync theatre, with
// A's physicality") in favor of `KitSyncTheatre`: the section now SHOWS
// the P9.8 hard-sync flagship (D5 as amended: kit edits propagate to every
// attached code) instead of captioning it, and the heading takes the
// stronger claim the reversal made true. Mono strip cites D5 as amended at
// P9.8 — see docs/DECISIONS.md.
//
// P9.5-T-F2: `id="brand-system"` is the bento's anchor target; e2e asserts
// it resolves to exactly one element. It must survive every redesign.
export function BrandSystemSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="brand-system" variant="split" divider="none">
      <SectionHeading
        eyebrow="Brand system"
        index={index}
        title="Every code syncs instantly."
        lede="Set your kit once. Edit it anytime: every attached code re-renders in the same breath, from menu tents to ticket stubs."
        titleSize={titleSize}
        className="mb-10"
      />

      <SectionBody className="max-w-5xl">
        <KitSyncTheatre />
      </SectionBody>

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-start gap-4">
        <MonoStrip>edit the kit once · every attached code follows · reprints always current</MonoStrip>
        {BRAND_STUDIO_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/brand-studio">Explore the brand studio</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
