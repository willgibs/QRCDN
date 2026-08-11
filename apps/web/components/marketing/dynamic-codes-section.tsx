import type { ComponentProps } from "react";
import Link from "next/link";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { RetargetStage } from "@/components/marketing/retarget-stage";
import { DYNAMIC_CODES_DOORWAY_ENABLED } from "@/lib/marketing-flags";

/**
 * 05 — Dynamic codes. Rebuilt at P9.10-D5 on the board's reference (GitBook's
 * enterprise section): the heading, lede and doorway sit centered, one
 * upgraded visual holds the middle, and four claims flank it.
 *
 * The two `MonoStrip` guarantee lines this section used to close on are gone,
 * but nothing they said is: "302 + no-store" and "≤ 5 min worst case" became
 * the "Never cached" and "Live at the edge" features, and the downgrade
 * guarantee became "Your code never dies" in full. They were three facts
 * compressed into two strips of 11px mono under the artwork; they are now
 * four claims a visitor can actually read. `/pricing`'s guarantee strip still
 * carries the downgrade sentence verbatim, and e2e still asserts it there.
 *
 * `variant="centered"` is this section's first use, and it takes the page to
 * THREE centered sections (05, 12 the manifesto, and the closing) — the cap
 * `section.tsx` documents. Worth spending here: 05 is the middle of the page
 * and every one of its neighbours is a left-aligned split or showcase, which
 * is exactly the layout monotony the board asked to break.
 *
 * The doorway moves from a quiet `LearnMoreLink` beside the mono strips to a
 * real button under the lede, the same move D2 made for 09's "Read the docs".
 *
 * The lede was cut at the board's R3 note. It used to read "A QRCDN code is a
 * permanent address. Retarget it in seconds and the printed code never
 * changes." — three claims that the four features underneath now each make
 * properly, so the lede was spending the reader's attention introducing what
 * the section was about to demonstrate. It states the idea in two beats now
 * and gets out of the way.
 */
export function DynamicCodesSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="dynamic-codes" variant="centered" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Dynamic links"
        index={index}
        title="Update a destination anytime"
        lede="Print the code once. Change where it goes as often as you like."
        titleSize={titleSize}
        actions={
          DYNAMIC_CODES_DOORWAY_ENABLED ? (
            <Button asChild variant="secondary">
              <Link href="/features/dynamic-codes">Explore dynamic codes</Link>
            </Button>
          ) : undefined
        }
        className="mb-block"
      />

      <SectionBody>
        <RetargetStage />
      </SectionBody>
    </Section>
  );
}
