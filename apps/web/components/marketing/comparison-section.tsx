import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { ANNUAL_MONTHLY_EQUIV_USD } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * 08 — Comparison (P9.5-T3c, new section). Archetype columns (never a named
 * vendor, per the board's own lock — docs/STATUS.md's P9.5 open note: "open
 * source approved... archetype comparison now, named-vendor pages post-
 * launch"). Cell content is deck-verbatim; the deck's own dash notation
 * ("— ✕ (trial traps common) · ✕ ...") is table notation, not rendered
 * copy, so it's expressed here as real `<table>` markup instead. Plain
 * `<table>` (not the vendored `components/ui/table.tsx`, which ships
 * `"use client"`) — this section is a hard "zero client JS" requirement,
 * same reasoning /developers' own Errors table already follows.
 *
 * Glyph color stays restrained rather than a traffic-light red/amber/green
 * matrix: every glyph/note in the three competitor columns reads muted
 * regardless of shape (✓/✕/~/prose), and only the QRCDN column carries the
 * primary tint — the "QRCDN wins every row" claim is the whole point of
 * this table, so accent belongs to the column, not scattered per-glyph.
 *
 * Review round 1: two table variants, not one reordered via CSS. A native
 * `<table>`'s columns don't participate in flex/grid `order` (that layout
 * mode doesn't apply to table-cell boxes), so "QRCDN first on mobile, last
 * on desktop" needs the DOM itself to differ — `ComparisonTable` takes a
 * `columnOrder` and both call sites pull from the same ROWS/COLUMNS data,
 * so there's no risk of the two variants' CONTENT drifting apart, only
 * their column arrangement. `md:hidden` / `hidden md:block` picks exactly
 * one at a time (verified: only the visible one is in the accessibility
 * tree, since `display:none` elements are always excluded from it — a
 * `table:visible` Playwright locator is what the e2e suite uses to target
 * "whichever one is actually showing" without needing extra markup).
 */

type Tone = "neutral" | "qrcdn";

interface ComparisonCell {
  glyph?: "✓" | "✕" | "~";
  note: string;
}

interface ComparisonRow {
  label: string;
  cells: [ComparisonCell, ComparisonCell, ComparisonCell, ComparisonCell];
}

const COLUMNS = ["Free QR generators", "Link-shortener add-ons", "Enterprise QR platforms", "QRCDN"] as const;
const QRCDN_INDEX = COLUMNS.length - 1;

// Desktop keeps the deck's own column order (QRCDN last, the "and here's
// us" beat). Mobile leads with QRCDN — review round 1: the elevated column
// is the whole point of the table, and it must be visible without
// scrolling on a narrow viewport; the three archetype columns still follow
// it, in their original relative order, in the scrollable region.
const DESKTOP_COLUMN_ORDER = [0, 1, 2, 3] as const;
const MOBILE_COLUMN_ORDER = [3, 0, 1, 2] as const;

const ROWS: ComparisonRow[] = [
  {
    label: "Printed codes survive a downgrade",
    cells: [
      { glyph: "✕", note: "trial traps common" },
      { glyph: "✕", note: "link plans lapse" },
      { glyph: "~", note: "contract-dependent" },
      { glyph: "✓", note: "never deactivated" },
    ],
  },
  {
    label: "Source code public",
    cells: [
      { glyph: "✕", note: "" },
      { glyph: "✕", note: "" },
      { glyph: "✕", note: "" },
      { glyph: "✓", note: "MIT" },
    ],
  },
  {
    label: "Raw IPs stored",
    cells: [
      { note: "often" },
      { note: "yes (click tracking)" },
      { note: "varies" },
      { glyph: "✕", note: "never" },
    ],
  },
  {
    label: "Scannability enforced by an instrument",
    cells: [
      { glyph: "✕", note: "" },
      { glyph: "✕", note: "" },
      { glyph: "✕", note: "" },
      { glyph: "✓", note: "calibrated on real decodes" },
    ],
  },
  {
    label: "Price on the page",
    cells: [
      { glyph: "✓", note: "until the trap" },
      { glyph: "✓", note: "" },
      { note: "quote form" },
      { glyph: "✓", note: `$0 / $${ANNUAL_MONTHLY_EQUIV_USD}/mo annual` },
    ],
  },
];

function Cell({
  cell,
  colIndex,
  lastRow,
}: {
  cell: ComparisonCell;
  colIndex: number;
  lastRow: boolean;
}) {
  const tone: Tone = colIndex === QRCDN_INDEX ? "qrcdn" : "neutral";
  return (
    <td
      className={cn(
        "border-t border-border/60 px-4 py-3 align-top text-sm",
        tone === "qrcdn" &&
          "bg-primary/[0.04] text-foreground ring-1 ring-inset ring-primary/15 dark:bg-primary/[0.07]",
        tone === "neutral" && "text-muted-foreground",
        tone === "qrcdn" && lastRow && "rounded-b-xl",
      )}
    >
      <span className="flex flex-wrap items-baseline gap-1.5">
        {cell.glyph && (
          <span
            aria-hidden
            className={cn("font-semibold", tone === "qrcdn" ? "text-primary" : "text-muted-foreground/70")}
          >
            {cell.glyph}
          </span>
        )}
        {cell.note && <span>{cell.note}</span>}
      </span>
    </td>
  );
}

function ComparisonTable({ columnOrder }: { columnOrder: readonly number[] }) {
  return (
    <table className="w-full min-w-[640px] border-collapse text-left">
      <thead>
        <tr>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            &nbsp;
          </th>
          {columnOrder.map((colIndex) => {
            const isQrcdn = colIndex === QRCDN_INDEX;
            return (
              <th
                key={COLUMNS[colIndex]}
                scope="col"
                className={cn(
                  "px-4 py-3 text-sm font-semibold",
                  isQrcdn
                    ? "rounded-t-xl bg-primary/[0.04] text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/[0.07]"
                    : "text-foreground",
                )}
              >
                {COLUMNS[colIndex]}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row, rowIndex) => (
          <tr key={row.label}>
            <th
              scope="row"
              className="border-t border-border/60 px-4 py-3 text-left align-top text-sm font-medium text-foreground"
            >
              {row.label}
            </th>
            {columnOrder.map((colIndex) => (
              <Cell
                key={`${row.label}-${COLUMNS[colIndex]}`}
                cell={row.cells[colIndex]}
                colIndex={colIndex}
                lastRow={rowIndex === ROWS.length - 1}
              />
            ))}
          </tr>
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
        title="Industry-leading features."
        lede="The whole feature set, including what everyone offers. Where we lead is marked, and every row is something you can go and check."
        className="mb-10"
      />

      <SectionBody>
        {/* Mobile (<md): QRCDN first, so the elevated column reads without
            scrolling; the three archetype columns follow in the scrollable
            region. A static gradient hints there's more to scroll — no
            scroll-position tracking (this section stays zero client JS), so
            it's a permanent hint rather than one that fades once you're at
            the end; "subtle" by design, not a claim of exact scroll state. */}
        <div className="relative md:hidden">
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <ComparisonTable columnOrder={MOBILE_COLUMN_ORDER} />
          </div>
          <div
            aria-hidden
            // from-background, not -tint: this section renders on the
            // default surface (surface="tint" was a stale carryover from an
            // earlier surface assignment).
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-background to-transparent"
          />
        </div>

        {/* Desktop (md+): the deck's own column order, QRCDN last. Kept
            scrollable too (defensive — a narrow desktop window shouldn't
            force the page itself to scroll sideways), just without the
            mobile-only fade hint. */}
        <div className="hidden overflow-x-auto rounded-2xl border border-border/60 md:block">
          <ComparisonTable columnOrder={DESKTOP_COLUMN_ORDER} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Category patterns, not claims about any specific vendor.
        </p>
      </SectionBody>
    </Section>
  );
}
