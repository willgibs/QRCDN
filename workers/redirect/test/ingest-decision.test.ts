import { describe, expect, it } from "vitest";
import { decideIngest } from "../src/ingest-decision";

const REAL_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("decideIngest", () => {
  it("ingests a GET from a real browser UA with a codeId", () => {
    expect(decideIngest("GET", REAL_UA, "code-1")).toEqual({ shouldIngest: true, codeId: "code-1" });
  });

  it("skips HEAD requests (D3's UA + HEAD-request bot filter)", () => {
    expect(decideIngest("HEAD", REAL_UA, "code-1")).toEqual({ shouldIngest: false });
  });

  it("skips when codeId is undefined (unclaimed slug, unreachable Supabase, or pre-codeId KV entry)", () => {
    expect(decideIngest("GET", REAL_UA, undefined)).toEqual({ shouldIngest: false });
  });

  it("skips bot UAs even with a valid codeId", () => {
    expect(decideIngest("GET", "curl/8.4.0", "code-1")).toEqual({ shouldIngest: false });
    expect(decideIngest("GET", "Googlebot/2.1", "code-1")).toEqual({ shouldIngest: false });
  });

  it("skips when the UA is missing entirely", () => {
    expect(decideIngest("GET", null, "code-1")).toEqual({ shouldIngest: false });
  });
});
