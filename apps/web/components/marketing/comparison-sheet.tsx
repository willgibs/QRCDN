import { GlyphChip, type ChipTone } from "@/components/marketing/comparison-chips";
import {
  COMPARISON_BANDS,
  COMPARISON_COLUMNS,
  DESKTOP_COLUMN_ORDER,
  GLYPH_LABEL,
  MOBILE_COLUMN_ORDER,
  QRCDN_INDEX,
  leaderIndex,
  type ComparisonRow,
} from "@/lib/comparison";
import { cn } from "@/lib/utils";

/**
 * The full comparison sheet (P9.9-C3), rendered at /pricing#compare — the
 * "go and check" surface the landing's section 10 links to. Same data
 * module, same chips, opposite disclosure: every note and receipt is
 * VISIBLE here (this is also the surface that makes the landing's
 * hover-only notes accessible to touch and keyboard readers in full).
 *
 * Banded like the pricing matrix one section up (one <tbody> per band,
 * `scope="rowgroup"` header rows, `data-band` hooks for e2e) but NEVER
 * sticky: this table needs its `overflow-x-auto` wrapper (five columns),
 * and PricingMatrix's own comment records that sticky headers silently
 * break inside an overflow wrapper. Two DOM tables for the mobile
 * column-order flip, same as section 10 (a native table's columns can't
 * be CSS-reordered). Zero client JS, plain <a> links.
 */

function bandSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
}

function SheetRow({ row, columnOrder }: { row: ComparisonRow; columnOrder: readonly number[] }) {
  const leader = leaderIndex(row);
  const label = (
    <>
      <span className="underline decoration-foreground/40 decoration-dotted underline-offset-4">
        {row.label}
      </span>
      <span className="sr-only">, {row.detail}</span>
    </>
  );
  return (
    <tr
      data-kind={row.kind}
      className={cn(
        "border-t border-foreground/[0.08]",
        row.kind !== "parity" && "bg-foreground/[0.03]",
      )}
    >
      <th scope="row" className="px-4 py-3 text-left align-top">
        {row.href ? (
          <a
            href={row.href}
            data-tip={row.detail}
            className="cmp-tip whitespace-nowrap text-sm font-medium text-foreground"
          >
            {label}
          </a>
        ) : (
          <span
            data-tip={row.detail}
            className="cmp-tip whitespace-nowrap text-sm font-medium text-foreground"
          >
            {label}
          </span>
        )}
      </th>
      {columnOrder.map((colIndex) => {
        const cell = row.cells[colIndex];
        const isQrcdn = colIndex === QRCDN_INDEX;
        const tone: ChipTone =
          leader === colIndex ? (isQrcdn ? "lead" : "gaplead") : isQrcdn ? "qrcdn" : "field";
        const showReceipt = leader === colIndex && row.receipt && row.receipt !== cell.note;
        return (
          <td
            key={colIndex}
            data-cell={isQrcdn ? "qrcdn" : undefined}
            className={cn(
              "px-3 py-3 text-left align-top text-sm",
              isQrcdn
                ? "border-x border-white/[0.12] bg-foreground/[0.05] text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <GlyphChip glyph={cell.glyph} tone={tone} />
              <span>
                <span className="sr-only">
                  {GLYPH_LABEL[cell.glyph]}
                  {cell.note ? ", " : ""}
                </span>
                {cell.note}
              </span>
            </span>
            {showReceipt && (
              <span className="mt-1 block pl-7 font-mono text-[0.68rem] text-foreground/75">
                {row.receipt}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function SheetTable({ columnOrder }: { columnOrder: readonly number[] }) {
  return (
    <table className="w-full min-w-[760px] border-collapse">
      <caption className="sr-only">The full feature comparison across the industry</caption>
      <thead>
        <tr>
          <th scope="col" className="px-4 pb-3 pt-4 text-left">
            <span className="sr-only">Feature</span>
          </th>
          {columnOrder.map((colIndex) => (
            <th
              key={COMPARISON_COLUMNS[colIndex]}
              scope="col"
              className={cn(
                "whitespace-nowrap px-3 pb-3 pt-4 text-left text-[0.8rem] font-semibold",
                colIndex === QRCDN_INDEX
                  ? "border-x border-white/[0.12] bg-foreground/[0.05] text-foreground"
                  : "text-foreground",
              )}
            >
              {COMPARISON_COLUMNS[colIndex]}
            </th>
          ))}
        </tr>
      </thead>
      {COMPARISON_BANDS.map((band) => (
        <tbody key={band.name} data-band={bandSlug(band.name)}>
          <tr>
            <th
              scope="rowgroup"
              colSpan={COMPARISON_COLUMNS.length + 1}
              className="px-4 pb-2 pt-6 text-left font-mono text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              {band.name}
            </th>
          </tr>
          {band.rows.map((row) => (
            <SheetRow key={row.id} row={row} columnOrder={columnOrder} />
          ))}
        </tbody>
      ))}
    </table>
  );
}

export function ComparisonSheet() {
  return (
    <>
      <div className="cmp-clip relative rounded-2xl border border-border/60 md:hidden">
        <div className="overflow-x-auto">
          <SheetTable columnOrder={MOBILE_COLUMN_ORDER} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-background to-transparent"
        />
      </div>
      <div className="cmp-clip hidden overflow-x-auto rounded-2xl border border-border/60 md:block">
        <SheetTable columnOrder={DESKTOP_COLUMN_ORDER} />
      </div>
    </>
  );
}
