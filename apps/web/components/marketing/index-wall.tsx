import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { LANDING_INDEX } from "@/lib/landing-index";

/**
 * 02 — the index wall (P9.10-D4), replacing the 01 highlights bento.
 *
 * The bento was retired for saying what the page already says: its five cards
 * were the filmstrip's four stations plus the API, two of its five artworks
 * were literal duplicates of the filmstrip's own (the retarget line and the
 * scan-bar chart), and its analytics card described analytics in nearly the
 * filmstrip's words 1,100px above it. The zone enumerated the product four
 * times across 2.1 screens before anything was demonstrated.
 *
 * So this section does the one job the bento did that nothing else does:
 * it feeds the landing's six anchors. It is not a second feature list. Each
 * row is a real section of THIS page at the ordinal that page renders, which
 * is why the device could not be lifted onto any other site: the numbers are
 * the page's own eyebrows, and `lib/landing-index.ts` documents the e2e
 * cross-check that keeps them true. The bento only ever lit five of the six
 * anchors; open source (11) joins here.
 *
 * Zero client JS. The hover is CSS (`globals.css`, the D4 blocks) and the
 * whole section is a server component, same posture 09 took when its tabs
 * island retired at D2.
 */

export function IndexWall() {
  return (
    <ul data-slot="index-wall" className="iw-list">
      {LANDING_INDEX.map((row) => (
        <li key={row.id}>
          <a href={`#${row.id}`} className="iw-row" data-slot="index-wall-row">
            <span className="iw-ord font-mono text-[0.75rem] tracking-[0.18em] tabular-nums">
              {row.ordinal}
            </span>
            <span className="iw-name font-display text-h2 font-medium text-balance">
              {row.name}
              {/* The aurora layer is a DUPLICATE of the name, not a treatment
                  applied to it: `background-clip: text` needs
                  `color: transparent`, and painting the readable string
                  transparent would make the row's accessible name depend on a
                  background image rendering. Stacked, aria-hidden, and faded
                  in on hover instead, so the real text is always a plain
                  foreground glyph. `content: attr()` on a pseudo-element
                  would have been shorter (it is what the shimmer-text
                  reference does) but Safari exposes pseudo-element content to
                  the accessibility tree, which would announce every row
                  twice. */}
              <span aria-hidden className="aurora-text-layer aurora-text">
                {row.name}
              </span>
            </span>
            <span className="iw-receipt font-mono text-[0.75rem] text-muted-foreground">
              {row.receipt}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function IndexWallSection({ index }: { index: string }) {
  return (
    <Section variant="stack" rhythm="tight" divider="none">
      {/* Deliberately inverted: the label is SMALLER than the rows it labels.
          An index's contents outrank its own masthead, and it is the one
          place on this page where that reads as composed rather than as a
          mistake, because every other section's title is the loudest thing
          in it for the same reason: those sections are arguing something.
          This one is pointing. It is also where the section's height came
          from, once the first draft measured taller than the bento. */}
      <SectionHeading
        eyebrow="Index"
        index={index}
        title="Our full-stack platform"
        titleSize="h3"
        className="mb-8"
      />
      <SectionBody>
        <IndexWall />
      </SectionBody>
    </Section>
  );
}
