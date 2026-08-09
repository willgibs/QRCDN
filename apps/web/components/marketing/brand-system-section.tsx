import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
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
      {/* C1-R2d (board annotation): the doorway rides the bottom of the
          heading group and the mono strip is gone — the lede and the save
          note now carry the sync claim on this section (the strip's line
          still lives on /features/brand-studio). */}
      <SectionHeading
        eyebrow="Brand kits"
        index={index}
        title="Every code syncs instantly"
        lede="Set your kit once. Edit it anytime: every attached code re-renders in the same breath, from menu tents to ticket stubs."
        titleSize={titleSize}
        className="mb-4"
      />
      {BRAND_STUDIO_DOORWAY_ENABLED && (
        <SectionBody className="mb-10">
          <LearnMoreLink href="/features/brand-studio">Explore the brand studio</LearnMoreLink>
        </SectionBody>
      )}

      <SectionBody className="max-w-5xl">
        <KitSyncTheatre />
      </SectionBody>
    </Section>
  );
}
