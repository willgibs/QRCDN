import { parseQrStyle } from "@qrcdn/shared";
import { ModuleMark } from "@/components/brand/marks";
import { GlyphChip, type ChipTone } from "@/components/marketing/comparison-chips";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import {
  COMPARISON_COLUMNS,
  DESKTOP_COLUMN_ORDER,
  GLYPH_LABEL,
  LANDING_ROWS,
  MOBILE_COLUMN_ORDER,
  QRCDN_INDEX,
  leaderIndex,
  type ComparisonRow,
} from "@/lib/comparison";
import { renderPreview } from "@/lib/preview";
import { cn } from "@/lib/utils";

/**
 * 10 — Comparison (P9.9-C3 full rebuild): the board's "lit bench". The
 * data moved to lib/comparison.ts (one source for this section AND
 * /pricing#compare's full sheet); this file is pure staging.
 *
 * The three-round board arc that shaped it: round 1 fixed the content (the
 * old five-row table couldn't honor its own lede; now the full set is
 * graded by one symmetric rule, enterprise's honest wins included), round
 * 2 picked the chip-matrix treatment, round 3 cut the landing to twelve
 * rows and moved comprehensiveness to the pricing sheet. Board edits
 * applied verbatim: no "leads" badges (the lifted row + the filled chip IS
 * the mark), terse row labels with the full claim on hover, bare chips
 * with every note on hover, chips and any text centered on one
 * unbreakable line.
 *
 * Hover mechanics (zero client JS): `.cmp-tip` bubbles are pure CSS on a
 * `data-tip` attribute (globals.css), gated to hover-capable pointers.
 * Screen readers get the identical text as sr-only spans, and every note
 * is VISIBLE on /pricing#compare, so no reader is hover-dependent. The
 * dotted row-label underline is the affordance the board asked back.
 *
 * The bench: the table sits on a lit panel (`.cmp-panel`) with three of
 * the studio's paper mats tucked BEHIND it (z-0 vs the panel's z-10),
 * peeking out top-right and bottom-left. The mats are real engine renders
 * on white, server-rendered at build time (this section stays out of the
 * client chunk graph entirely); all three inks are instrument-certified
 * 100 on white (C2's 48-combo sweep, scratchpad verify-c2-dials.ts).
 * Decor hides below lg. If the board tires of the mats, deleting
 * DECOR_MATS reverts the section to the quiet-panel look (round-3 I) with
 * no other change.
 *
 * Zero client JS is this section's defining trait (P9.5-T3c, reaffirmed
 * every round): plain <table> markup, and the row proof-links are plain
 * <a> elements. The one exception is deliberate (C3-R1, board directive
 * "maintain the design system"): the pricing doorway is the system's
 * LearnMoreLink, whose next/link reference is already in every page's
 * client graph via SiteNav and the other sections — the section still
 * ships no island and hydrates nothing of its own. Two DOM tables, one
 * data source: a native
 * table's columns can't be reordered by CSS, so mobile (QRCDN column
 * first) and desktop (QRCDN last) each render their own <table> and
 * `md:hidden`/`hidden md:block` picks exactly one — the e2e suite targets
 * `table:visible` (P9.5 precedent).
 *
 * NOTE for grep archaeology: the phrase "use client" in this doc comment
 * is the reason a directive-grep once false-flagged this file as a client
 * island (recorded C3 scope correction). There is no directive here.
 */

const WHITE = "#ffffff";

// Same curated pairings the studio dials and presets ship (module size
// follows the shape, pupil follows the frame).
function matSvg(payload: string, dot: "square" | "rounded" | "circle", ink: string): string {
  const sizeRatio = dot === "square" ? 1 : dot === "rounded" ? 0.88 : 0.78;
  const frame = dot;
  const pupil = dot === "square" ? "square" : dot === "rounded" ? "rounded" : "dot";
  const style = parseQrStyle({
    v: 1,
    dots: { style: dot, sizeRatio },
    eyes: { frame, pupil, color: null },
    fill: { type: "solid", color: ink },
    background: { transparent: false, color: WHITE },
  });
  return renderPreview(payload, style).svg;
}

// All three inks instrument-certified 100 on white (C2 sweep). Payloads
// are anonymous studio play, distinct from section 04's Ember cast.
const DECOR_MATS = [
  {
    label: "qrcdn.com/rsvp",
    svg: matSvg("HTTPS://QRCDN.COM/RSVP", "square", "#1e3a8a"),
    className: "right-2 -top-14 w-28 rotate-3",
  },
  {
    label: "qrcdn.com/hello",
    svg: matSvg("HTTPS://QRCDN.COM/HELLO", "rounded", "#131316"),
    className: "-bottom-14 left-6 w-28 -rotate-3",
  },
  {
    label: "qrcdn.com/menu",
    svg: matSvg("HTTPS://QRCDN.COM/MENU", "circle", "#0f766e"),
    className: "-bottom-12 left-40 w-20 rotate-2",
  },
] as const;

function cellHover(row: ComparisonRow, colIndex: number): string | undefined {
  const cell = row.cells[colIndex];
  if (!cell.note) return undefined;
  const isLeader = leaderIndex(row) === colIndex;
  if (isLeader && row.receipt && row.receipt !== cell.note) {
    return `${cell.note}: ${row.receipt}`;
  }
  return cell.note;
}

function RowLabel({ row }: { row: ComparisonRow }) {
  const inner = (
    <>
      <span className="underline decoration-foreground/40 decoration-dotted underline-offset-4">
        {row.label}
      </span>
      <span className="sr-only">, {row.detail}</span>
    </>
  );
  const shared = "cmp-tip whitespace-nowrap text-sm font-medium text-foreground";
  return row.href ? (
    <a href={row.href} data-tip={row.detail} className={shared}>
      {inner}
    </a>
  ) : (
    <span data-tip={row.detail} className={shared}>
      {inner}
    </span>
  );
}

function LanderRow({ row, columnOrder }: { row: ComparisonRow; columnOrder: readonly number[] }) {
  const leader = leaderIndex(row);
  return (
    <tr
      data-kind={row.kind}
      className={cn(
        "border-t border-foreground/[0.08]",
        row.kind !== "parity" && "bg-foreground/[0.04]",
      )}
    >
      <th scope="row" className="px-4 py-3 text-left align-middle">
        <RowLabel row={row} />
      </th>
      {columnOrder.map((colIndex) => {
        const cell = row.cells[colIndex];
        const isQrcdn = colIndex === QRCDN_INDEX;
        const tone: ChipTone =
          leader === colIndex ? (isQrcdn ? "lead" : "gaplead") : isQrcdn ? "qrcdn" : "field";
        const hover = cellHover(row, colIndex);
        return (
          <td
            key={colIndex}
            data-cell={isQrcdn ? "qrcdn" : undefined}
            className={cn(
              "px-3 py-3 text-center align-middle",
              isQrcdn && "border-x border-white/[0.12] bg-foreground/[0.05]",
            )}
          >
            <span
              className={cn("inline-flex items-center whitespace-nowrap", hover && "cmp-tip")}
              data-tip={hover}
            >
              <GlyphChip glyph={cell.glyph} tone={tone} />
              <span className="sr-only">
                {GLYPH_LABEL[cell.glyph]}
                {hover ? `, ${hover}` : ""}
              </span>
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function LanderTable({ columnOrder }: { columnOrder: readonly number[] }) {
  return (
    <table className="w-full min-w-[600px] border-collapse">
      <caption className="sr-only">Feature comparison across the industry</caption>
      <thead>
        <tr>
          <th scope="col" className="px-4 pb-3 pt-4 text-left">
            <span className="sr-only">Feature</span>
          </th>
          {columnOrder.map((colIndex) => {
            const isQrcdn = colIndex === QRCDN_INDEX;
            return (
              <th
                key={COMPARISON_COLUMNS[colIndex]}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-3 pb-3 pt-4 text-center text-[0.8rem] font-semibold",
                  isQrcdn
                    ? "border-x border-white/[0.12] bg-foreground/[0.05] text-foreground"
                    : "text-foreground",
                )}
              >
                {isQrcdn ? (
                  <span className="inline-flex items-center gap-2">
                    <ModuleMark className="size-2.5" />
                    {COMPARISON_COLUMNS[colIndex]}
                  </span>
                ) : (
                  COMPARISON_COLUMNS[colIndex]
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {LANDING_ROWS.map((row) => (
          <LanderRow key={row.id} row={row} columnOrder={columnOrder} />
        ))}
      </tbody>
    </table>
  );
}

export function ComparisonSection({ index }: { index: string }) {
  return (
    <Section variant="stack" divider="none">
      <SectionHeading
        eyebrow="Comparison"
        index={index}
        title="Industry-leading features"
        lede="The whole feature set, including what everyone offers. Where we lead is marked, and every row is something you can go and check."
        className="mb-10"
      />

      <SectionBody>
        <div className="relative">
          {/* The print run resting behind the bench: decorative, hidden
              from AT and from small viewports. Deleting this block (and
              DECOR_MATS) is the sanctioned revert to the quiet panel. */}
          <div aria-hidden data-decor className="hidden lg:block">
            {DECOR_MATS.map((mat) => (
              <div
                key={mat.label}
                className={cn(
                  "absolute z-0 rounded-lg bg-white p-2 pb-1.5 shadow-[0_16px_34px_-14px_rgba(0,0,0,0.85)] ring-1 ring-black/10",
                  mat.className,
                )}
              >
                <div dangerouslySetInnerHTML={{ __html: mat.svg }} />
                <span className="mt-1 block font-mono text-[0.5rem] tracking-wide text-[#6b6b74]">
                  {mat.label}
                </span>
              </div>
            ))}
          </div>

          <div className="cmp-panel cmp-clip">
            {/* Mobile (<md): QRCDN column first; a static fade hints at the
                horizontal scroll (permanent by design: zero client JS means
                no scroll-position tracking). */}
            <div className="relative md:hidden">
              <div className="overflow-x-auto">
                <LanderTable columnOrder={MOBILE_COLUMN_ORDER} />
              </div>
              <div aria-hidden className="cmp-fade pointer-events-none absolute inset-y-0 right-0 w-10" />
            </div>
            {/* Desktop (md+): the deck's order, QRCDN last. */}
            <div className="hidden overflow-x-auto md:block">
              <LanderTable columnOrder={DESKTOP_COLUMN_ORDER} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 lg:mt-20">
          <p className="text-xs text-muted-foreground">
            Category patterns, not claims about any specific vendor.
          </p>
          <LearnMoreLink href="/pricing#compare">See the full sheet on pricing</LearnMoreLink>
        </div>
      </SectionBody>
    </Section>
  );
}
