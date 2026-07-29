import { describe, expect, it } from "vitest";
import { buildResultsCsv, csvField } from "./csv";

/**
 * Guards the bulk-results export against spreadsheet formula injection
 * (CWE-1236) and ordinary RFC-4180 delimiter breakage. Code names are free
 * text and this file is explicitly meant to be opened in a spreadsheet, so a
 * name beginning with = + - @ must land as literal text, never as a live
 * formula in whoever opens it.
 */
describe("csvField — formula injection", () => {
  it.each(['=HYPERLINK("http://evil","Invoice")', "+1+1", "-1+1", "@SUM(A1)", "\tlead", "\rlead"])(
    "neutralizes the leading formula character in %j",
    (value) => {
      // Apostrophe-prefixed so the spreadsheet renders text. The apostrophe can
      // sit inside RFC-4180 quotes when the value also breaks delimiters.
      expect(csvField(value).replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("leaves ordinary names untouched", () => {
    expect(csvField("Spring campaign")).toBe("Spring campaign");
    expect(csvField("2026 launch")).toBe("2026 launch");
  });

  it("quotes and escapes a formula value that also breaks delimiters", () => {
    expect(csvField('=CMD("a,b")')).toBe('"\'=CMD(""a,b"")"');
  });
});

describe("csvField — RFC 4180", () => {
  it("quotes a field containing a comma", () => {
    expect(csvField("Paris, France")).toBe('"Paris, France"');
  });

  it("doubles embedded quotes", () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes a field containing a newline", () => {
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("passes an empty field through", () => {
    expect(csvField("")).toBe("");
  });
});

describe("buildResultsCsv", () => {
  it("emits a header plus one row per outcome, successes and failures", () => {
    const csv = buildResultsCsv([
      { name: "Good", ok: true, slug: "ABCD234", url: "https://qrcdn.com/ABCD234" },
      { name: "Bad", ok: false, error: "invalid_destination" },
    ]);
    expect(csv.split("\n")).toEqual([
      "name,url,status,error",
      "Good,https://qrcdn.com/ABCD234,created,",
      "Bad,,failed,invalid_destination",
    ]);
  });

  it("guards a malicious name inside a full export", () => {
    const csv = buildResultsCsv([{ name: "=1+1", ok: false, error: "invalid_destination" }]);
    expect(csv).toContain("'=1+1");
  });
});
