import { describe, expect, it } from "vitest";

import {
  COMPARISON_BAND_NAMES,
  COMPARISON_BANDS,
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
  GLYPH_CHAR,
  GLYPH_LABEL,
  LANDING_ROWS,
  QRCDN_INDEX,
  leaderIndex,
  DESKTOP_COLUMN_ORDER,
  MOBILE_COLUMN_ORDER,
} from "./comparison";
import { PLAN_LIMITS } from "./entitlements";
import { ANNUAL_MONTHLY_EQUIV_USD } from "./pricing";
import { MIN_SLUG_LENGTH, MAX_SLUG_LENGTH } from "./slug";

// Derivation proofs for the comparison data (P9.9-C3), modeled on
// pricing.test.ts: the table can never drift from the entitlements source
// because every numeric claim is asserted to CONTAIN the live value, and
// the band grouping is proven lossless rather than eyeballed.

describe("comparison bands", () => {
  it("groups every row into exactly one band, losslessly", () => {
    const grouped = COMPARISON_BANDS.flatMap((band) => band.rows);
    expect(grouped).toHaveLength(COMPARISON_ROWS.length);
    expect(new Set(grouped.map((row) => row.id)).size).toBe(COMPARISON_ROWS.length);
    for (const row of COMPARISON_ROWS) {
      expect(COMPARISON_BAND_NAMES).toContain(row.band);
    }
    // No empty band ships: a header with nothing under it is a layout bug.
    for (const band of COMPARISON_BANDS) {
      expect(band.rows.length).toBeGreaterThan(0);
    }
  });

  it("keeps row ids unique and cells exactly one per column", () => {
    for (const row of COMPARISON_ROWS) {
      expect(row.cells).toHaveLength(COMPARISON_COLUMNS.length);
    }
  });
});

describe("landing cut", () => {
  it("is the 12-row board cut with the agreed grading census", () => {
    expect(LANDING_ROWS).toHaveLength(12);
    expect(LANDING_ROWS.filter((row) => row.kind === "lead")).toHaveLength(7);
    expect(LANDING_ROWS.filter((row) => row.kind === "gap")).toHaveLength(1);
  });

  it("gives every landing row a terse label, a full detail, and glyphs in all four cells", () => {
    for (const row of LANDING_ROWS) {
      expect(row.label.length).toBeGreaterThan(0);
      // Terse means terse: the hover carries the sentence, not the label.
      expect(row.label.split(" ").length).toBeLessThanOrEqual(4);
      expect(row.detail.length).toBeGreaterThan(row.label.length);
      for (const cell of row.cells) {
        expect(GLYPH_CHAR[cell.glyph]).toBeTruthy();
        expect(GLYPH_LABEL[cell.glyph]).toBeTruthy();
      }
    }
  });
});

describe("symmetric grading", () => {
  it("marks QRCDN on lead rows and enterprise on gap rows, nothing on parity", () => {
    for (const row of COMPARISON_ROWS) {
      const leader = leaderIndex(row);
      if (row.kind === "lead") {
        expect(leader).toBe(QRCDN_INDEX);
        expect(row.cells[QRCDN_INDEX].glyph).toBe("yes");
      } else if (row.kind === "gap") {
        expect(leader).toBe(2);
        expect(row.cells[2].glyph).toBe("yes");
        // A gap row is an honest concession: our own cell must not claim yes.
        expect(row.cells[QRCDN_INDEX].glyph).not.toBe("yes");
      } else {
        expect(leader).toBeNull();
      }
      // Every marked row carries its receipt (the leading cell's why).
      if (row.kind !== "parity") {
        expect(row.receipt?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("numbers come from the source, never retyped", () => {
  const row = (id: string) => {
    const found = COMPARISON_ROWS.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`missing comparison row: ${id}`);
    return found;
  };

  it("brand kit count derives from entitlements", () => {
    expect(row("kit-sync").receipt).toContain(String(PLAN_LIMITS.free.brandKits));
    expect(row("kit-sync").detail).toContain(String(PLAN_LIMITS.free.brandKits));
  });

  it("retention windows derive from entitlements", () => {
    const cell = row("retention").cells[QRCDN_INDEX];
    expect(cell.note).toContain(String(PLAN_LIMITS.free.analyticsRetentionDays));
    expect(cell.note).toContain(String(PLAN_LIMITS.pro.analyticsRetentionDays));
  });

  it("API volume derives from entitlements", () => {
    const formatted = (PLAN_LIMITS.pro.apiMonthlyRequests ?? 0).toLocaleString("en-US");
    expect(row("api").cells[QRCDN_INDEX].note).toContain(formatted);
    expect(row("api").detail).toContain(formatted);
  });

  it("slug bounds derive from lib/slug", () => {
    const note = row("short-links").cells[QRCDN_INDEX].note;
    expect(note).toContain(String(MIN_SLUG_LENGTH));
    expect(note).toContain(String(MAX_SLUG_LENGTH));
  });

  it("the annual price derives from lib/pricing", () => {
    expect(row("price").cells[QRCDN_INDEX].note).toContain(`$${ANNUAL_MONTHLY_EQUIV_USD}`);
  });
});

describe("column orders", () => {
  it("mobile leads with QRCDN, desktop closes with it, both permute all columns", () => {
    expect(MOBILE_COLUMN_ORDER[0]).toBe(QRCDN_INDEX);
    expect(DESKTOP_COLUMN_ORDER[DESKTOP_COLUMN_ORDER.length - 1]).toBe(QRCDN_INDEX);
    expect([...MOBILE_COLUMN_ORDER].sort()).toEqual([...DESKTOP_COLUMN_ORDER].sort());
  });

  it("proof links are absolute paths so the sheet can render on /pricing", () => {
    for (const row of COMPARISON_ROWS) {
      if (row.href) expect(row.href.startsWith("/")).toBe(true);
    }
  });
});
