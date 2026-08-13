import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { BRAND_STUDIO_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { KitNetwork } from "./kit-network";

// 04 — Brand kits. The body is THE KIT NETWORK since P9.10-D12 (board
// brief: the brand card as the central engine, codes connected by subtle
// dotted lines, a pulse carrying every kit update out to them) — the D5
// hard-sync flagship drawn literally. D12.1 board notes: the hub
// centered with two codes per side (the frozen fourth mat read as a
// defect, so its D5 null-kit truth moved into the explainer row below
// the stage), and the section carries real feature copy now, not just
// heading + visual. Its predecessor KitSyncTheatre (P9.9-C1) lives on
// as /features/brand-studio's body and still owns the ks CSS block.
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

      {/* The sandbox (D12.2 board note): a full-width framed canvas
          around the network — the design-tool playground read. The dot
          lattice is the canvas texture (border-token dots on a 24px
          lattice, edge-faded), desktop-only like the frame itself; below
          lg the network stacks bare. */}
      <SectionBody>
        <div className="relative lg:rounded-3xl lg:border lg:border-border/60 lg:bg-card/25 lg:px-10 lg:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden rounded-[inherit] lg:block"
            style={{
              backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse 75% 85% at 50% 50%, black 55%, transparent 100%)",
            }}
          />
          <KitNetwork />
        </div>
      </SectionBody>

      {/* The explainer row (D12.1): the feature in words. Every claim is
          D5 as amended — including the frozen-snapshot rule the visual
          no longer tries to draw. Typography mirrors section 03's
          feature rows so the two zones read as one family. */}
      <SectionBody delay={0.15} className="mt-12 max-w-5xl">
        <ul className="grid gap-8 sm:grid-cols-3">
          <li>
            <h3 className="font-display text-sm font-semibold">One kit, every surface</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Modules, eyes, ink, and logo live in the kit. Attach any code and it prints on
              brand, from a menu tent to a poster.
            </p>
          </li>
          <li>
            <h3 className="font-display text-sm font-semibold">Edits propagate instantly</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Save a change and every attached code re-renders in place. Reprints always pick up
              the current look, and scans are never touched.
            </p>
          </li>
          <li>
            <h3 className="font-display text-sm font-semibold">Old looks stay safe</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Keep a legacy kit and its codes keep the old style. Detach a code and it freezes
              exactly as printed, never restyled.
            </p>
          </li>
        </ul>
      </SectionBody>
    </Section>
  );
}
