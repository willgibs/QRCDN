import type { BulkItemOutcome } from "./codes-core";

// CSV emitters for user-facing exports. Lives in lib (not beside the dialog
// that uses it) so it is unit-testable: this repo's Vitest has no
// tsconfig-paths plugin, so a test importing a component would have to resolve
// that component's whole `@/components/ui/*` tree.

// Spreadsheets (Excel / Numbers / Sheets) evaluate any cell whose text begins
// with = + - @ (or a leading tab/CR) as a FORMULA. Code names are free text, so
// a name like `=HYPERLINK("http://evil","Invoice")` would become a live link in
// whoever opens the export rather than the literal text the user typed — CSV
// injection, CWE-1236. RFC-4180 quoting does NOT prevent this; spreadsheets
// still parse the quoted contents. Prefixing with an apostrophe is the standard
// mitigation: the cell is treated as text and the apostrophe isn't displayed.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/** RFC-4180 field encoding plus a spreadsheet-formula guard. */
export function csvField(value: string): string {
  const guarded = FORMULA_LEAD.test(value) ? `'${value}` : value;
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** Bulk-create results as a CSV: one row per submitted line, successes and
 *  failures both, so a user can fix the failures and re-submit just those. */
export function buildResultsCsv(results: BulkItemOutcome[]): string {
  const header = "name,url,status,error";
  const rows = results.map((r) =>
    [r.name, r.ok ? r.url : "", r.ok ? "created" : "failed", r.ok ? "" : r.error]
      .map(csvField)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
