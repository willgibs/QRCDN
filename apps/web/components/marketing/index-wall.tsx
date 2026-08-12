import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { LANDING_INDEX } from "@/lib/landing-index";

/**
 * 02 — the features wall (P9.10-D4 as the index wall; re-cut at D10).
 *
 * It feeds the landing's six anchors — the one job its predecessor (the
 * highlights bento) did that nothing else does — without becoming a second
 * feature list. D10 board notes: rows number 1-6 in the wall's own order
 * (the old echo of each target's page ordinal read as a puzzle: 03, 04, 05,
 * 07, 09, 11 looks like a mistake unless you already know the page), the
 * receipt line gave way to an arrow (the row is a link; the arrow says so
 * where a sentence only described), and rows center rather than sitting on
 * their baselines.
 *
 * Zero client JS. The hover is CSS (`globals.css`, the D4/D10 blocks) and
 * the whole section is a server component.
 */

export function IndexWall() {
  return (
    <ul data-slot="index-wall" className="iw-list">
      {LANDING_INDEX.map((row, i) => (
        <li key={row.id}>
          <a href={`#${row.id}`} className="iw-row" data-slot="index-wall-row">
            <span className="iw-ord font-mono text-[0.75rem] tracking-[0.18em] tabular-nums">
              {String(i + 1).padStart(2, "0")}
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
            {/* The arrow denotes clickability (D10) — decoration on a link
                whose accessible name is the row text, so aria-hidden. */}
            <span aria-hidden className="iw-arrow">
              <svg viewBox="0 0 16 16" className="size-4" fill="none">
                <path
                  d="M2.5 8h10.5m0 0L8.5 3.5M13 8l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
          This one is pointing. */}
      <SectionHeading
        eyebrow="Features"
        index={index}
        title="Our platform"
        titleSize="h3"
        className="mb-8"
      />
      <SectionBody>
        <IndexWall />
      </SectionBody>
    </Section>
  );
}
