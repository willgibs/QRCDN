import type { ComponentProps } from "react";
import Link from "next/link";
import { Gauge, ImagePlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { StudioObject } from "./studio-object";

// 03 — Design studio (P9.10-D11 restage). The board refocused this section
// on ONE code with configuration options — section 04 owns brand kits and
// the many-codes visual — rendered as a true 3D object: the WebGL slab in
// StudioObject, with the config panel floating at its side and the studio
// argument carried by the feature rows on the left. The four-mat dial
// wall (P9.9-C2's studio-dials) retired with this restage.
//
// `id="studio"` is the features wall's anchor target (e2e asserts it
// resolves): it must survive every redesign, same rule as #brand-system.
// The /features/brand-studio doorway lives ONLY on section 04; this
// section's close is the /studio CTA, carrying the page promise in the
// board's D11.2 cut: "Free, no account required".

// Every claim is live product truth: the instrument certification is the
// C2 record (all 48 panel combos at 100), the knockout and export lines
// are /studio's own feature set. No invented compliance, ever.
const FEATURES = [
  {
    icon: Gauge,
    title: "Scannability instrument",
    note: "Every kit scores against the real engine as you design. All the combos on this panel read 100.",
  },
  {
    icon: ImagePlus,
    title: "Logo knockout",
    note: "Drop a mark in the center. The engine carves its space and holds error correction above the floor.",
  },
  {
    icon: Download,
    title: "Print-ready export",
    note: "SVG and PNG, sRGB inks, quiet zone baked in. No watermark at any tier.",
  },
] as const;

export function StudioSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    // overflow-x-clip: the WebGL canvas overdraws the object's stage by
    // 21% per side for tilt/light headroom; with the stage anchored to
    // the content's right edge (D11.1) that spill would widen the page
    // at <=1024. Clipping at the section's full-bleed box crops only
    // empty canvas corners — the slab itself never reaches them.
    <Section
      id="studio"
      variant="showcase"
      surface="floor"
      divider="none"
      className="overflow-x-clip"
    >
      <SectionHeading
        eyebrow="Studio"
        index={index}
        title="Design your perfect brand"
        lede="The real engine under a real light: turn a dial and the object follows. Everything else waits in the studio, free."
        titleSize={titleSize}
        className="mb-10"
      />
      <SectionBody>
        {/* D11.1: the text column widened (20 -> 24rem); D11.3:
            items-start (was center) — measured, the centering offset was
            the larger half of the heading-to-content gap the board
            flagged. D11.4 board note: the columns FLIPPED — the object
            leads on the left, the text breathes on the right. DOM order
            now matches visual order, so the mobile order-* pair retired
            (the object was already first on small screens). */}
        <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <StudioObject />
          </div>
          <div className="flex flex-col gap-8">
            <ul className="flex flex-col gap-6">
              {FEATURES.map(({ icon: Icon, title, note }) => (
                <li key={title} className="flex gap-3.5">
                  <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
                  <div>
                    <h3 className="font-display text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              {/* P9.10-D3: shed shadow-primary/25 — the violet-era CTA glow;
                  the plain shadow-lg carries the lift. */}
              <Button asChild size="lg" className="rounded-full px-6 shadow-lg">
                <Link href="/studio">Open the studio</Link>
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                Free, no account required
              </p>
            </div>
          </div>
        </div>
      </SectionBody>
    </Section>
  );
}
