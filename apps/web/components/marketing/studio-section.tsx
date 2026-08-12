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
// section's close is the /studio CTA, carrying the real page promise
// (free, no account, no watermark — /studio's own metadata).

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
    note: "Drop a mark in the center. The engine carves its quiet space and holds error correction above the floor.",
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
    <Section id="studio" variant="showcase" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Studio"
        index={index}
        title="Design one right now"
        lede="The real engine under a real light: turn a dial and the object follows. Everything else waits in the studio, free."
        titleSize={titleSize}
        className="mb-10"
      />
      <SectionBody>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-center lg:gap-16">
          <div className="order-2 flex flex-col gap-8 lg:order-none">
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
                free · no account · no watermark
              </p>
            </div>
          </div>
          <div className="order-1 min-w-0 lg:order-none">
            <StudioObject />
          </div>
        </div>
      </SectionBody>
    </Section>
  );
}
