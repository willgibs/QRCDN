import { describe, expect, it } from "vitest";
import { formatDate } from "./date-format";

describe("formatDate", () => {
  it("formats a date-only string (scan_daily.day / ChartPoint.day shape)", () => {
    expect(formatDate("2026-07-03")).toBe("Jul 3");
  });

  it("formats a full ISO timestamp (qr_codes.created_at shape)", () => {
    expect(formatDate("2026-08-02T14:23:01.000Z")).toBe("Aug 2");
  });

  it("reads UTC date parts, not local ones — a late-UTC timestamp never rolls to the next local day", () => {
    // 23:30 UTC on Jul 31 — a local-timezone read west of UTC could roll
    // this backward to Jul 30 if it used local getters instead of UTC ones.
    expect(formatDate("2026-07-31T23:30:00.000Z")).toBe("Jul 31");
  });

  it("is stable across every month boundary", () => {
    expect(formatDate("2026-01-01")).toBe("Jan 1");
    expect(formatDate("2026-12-31")).toBe("Dec 31");
    expect(formatDate("2026-02-28")).toBe("Feb 28");
  });

  it("produces the same output regardless of how the caller phrased the input's time component", () => {
    expect(formatDate("2026-07-03")).toBe(formatDate("2026-07-03T00:00:00.000Z"));
  });
});
