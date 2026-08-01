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
  tone,
  lastRow,
}: {
  cell: ComparisonCell;
  tone: Tone;
  lastRow: boolean;
}) {
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

export function ComparisonSection() {
  return (
    <Section variant="stack" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Comparison"
        index="08"
        title="Not another QR generator."
        lede="The category has habits: free codes that die, scans that get tracked, prices behind a quote form. We built the opposite, in the open."
        className="mb-10"
      />

      <SectionBody>
        <div className="overflow-x-auto rounded-2xl border border-border/60">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  &nbsp;
                </th>
                {COLUMNS.map((col, i) => {
                  const isQrcdn = i === COLUMNS.length - 1;
                  return (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        "px-4 py-3 text-sm font-semibold",
                        isQrcdn
                          ? "rounded-t-xl bg-primary/[0.04] text-primary ring-1 ring-inset ring-primary/15 dark:bg-primary/[0.07]"
                          : "text-foreground",
                      )}
                    >
                      {col}
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
                  {row.cells.map((cell, i) => (
                    <Cell
                      key={`${row.label}-${COLUMNS[i]}`}
                      cell={cell}
                      tone={i === row.cells.length - 1 ? "qrcdn" : "neutral"}
                      lastRow={rowIndex === ROWS.length - 1}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Category patterns, not claims about any specific vendor.
        </p>
      </SectionBody>
    </Section>
  );
}
