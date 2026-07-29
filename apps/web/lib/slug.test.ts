import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, SLUG_CHARSET, SLUG_LENGTH, generateSlug, isValidSlug, validateVanitySlug } from "./slug";

// Characters deliberately excluded from SLUG_CHARSET for confusability at
// print/scan size (see slug.ts header) — must never appear.
const CONFUSABLES = ["0", "O", "1", "I", "L", "U"];

describe("SLUG_CHARSET", () => {
  it("never contains a confusable character", () => {
    for (const char of CONFUSABLES) {
      expect(SLUG_CHARSET).not.toContain(char);
    }
  });

  it("contains only uppercase letters and digits", () => {
    expect(SLUG_CHARSET).toMatch(/^[A-Z0-9]+$/);
  });

  it("has no duplicate characters", () => {
    expect(new Set(SLUG_CHARSET).size).toBe(SLUG_CHARSET.length);
  });

  it("is 30 symbols", () => {
    expect(SLUG_CHARSET).toHaveLength(30);
  });
});

describe("generateSlug", () => {
  it("produces a slug of SLUG_LENGTH characters", () => {
    expect(generateSlug()).toHaveLength(SLUG_LENGTH);
    expect(SLUG_LENGTH).toBe(7);
  });

  it("only draws characters from SLUG_CHARSET across many draws", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      for (const char of slug) {
        expect(SLUG_CHARSET).toContain(char);
      }
    }
  });

  it("is deterministic given an injected random function", () => {
    const sequence = [0, 0.11, 0.22, 0.33, 0.44, 0.55, 0.99];
    const draw = () => {
      let i = 0;
      return () => sequence[i++ % sequence.length];
    };

    expect(generateSlug(draw())).toBe(generateSlug(draw()));
  });

  it("produces the exact characters implied by a fixed random sequence", () => {
    const sequence = [0, 0.5, 0.999999, 0.1, 0.2, 0.3, 0.4];
    let i = 0;
    const slug = generateSlug(() => sequence[i++]);

    const expected = sequence
      .map((value) => SLUG_CHARSET[Math.floor(value * SLUG_CHARSET.length)])
      .join("");
    expect(slug).toBe(expected);
  });

  it("never indexes out of bounds when random() returns exactly 1", () => {
    const slug = generateSlug(() => 1);
    expect(slug).toBe(SLUG_CHARSET[SLUG_CHARSET.length - 1].repeat(SLUG_LENGTH));
  });

  it("has a sane collision rate across 1000 draws", () => {
    // Charset^7 ≈ 2.19e10 possible slugs — 1000 real draws should never
    // collide in practice. A generous floor (not an exact-zero assertion)
    // guards against a genuinely broken generator (e.g. a constant or a
    // narrow-range random source) without making the test flaky.
    const draws = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      draws.add(generateSlug());
    }
    expect(draws.size).toBeGreaterThanOrEqual(990);
  });
});

describe("isValidSlug", () => {
  it("accepts a well-formed generated slug", () => {
    expect(isValidSlug(generateSlug())).toBe(true);
  });

  it("accepts the minimum length boundary (4)", () => {
    expect(isValidSlug("2345")).toBe(true);
  });

  it("rejects one below the minimum length (3)", () => {
    expect(isValidSlug("234")).toBe(false);
  });

  it("accepts the maximum length boundary (30)", () => {
    expect(isValidSlug(SLUG_CHARSET)).toBe(true);
  });

  it("rejects one above the maximum length (31)", () => {
    expect(isValidSlug(SLUG_CHARSET + "2")).toBe(false);
  });

  it("rejects a lowercase character", () => {
    expect(isValidSlug("234567a")).toBe(false);
  });

  it("rejects each confusable character individually", () => {
    for (const char of CONFUSABLES) {
      expect(isValidSlug(`23456${char}`)).toBe(false);
    }
  });

  it("rejects an empty string", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects a slug containing a non-alphanumeric character", () => {
    expect(isValidSlug("23456-")).toBe(false);
  });
});

// P7.5-U3: caller-chosen vanity slugs (Pro-gated in codes-core.ts — this
// module only validates format/reservation, not plan entitlement).
describe("validateVanitySlug", () => {
  it("rejects non-string input", () => {
    expect(validateVanitySlug(12345)).toEqual({ ok: false, error: "invalid_slug" });
    expect(validateVanitySlug(null)).toEqual({ ok: false, error: "invalid_slug" });
    expect(validateVanitySlug(undefined)).toEqual({ ok: false, error: "invalid_slug" });
  });

  it("normalizes lowercase input to uppercase, trimmed", () => {
    expect(validateVanitySlug("  party26  ")).toEqual({ ok: true, data: "PARTY26" });
  });

  it("rejects each confusable character individually (0, O, 1, I, L, U)", () => {
    for (const char of CONFUSABLES) {
      expect(validateVanitySlug(`23456${char}`)).toEqual({ ok: false, error: "invalid_slug" });
      // Lowercase confusables normalize to the same rejected uppercase form.
      expect(validateVanitySlug(`23456${char.toLowerCase()}`)).toEqual({
        ok: false,
        error: "invalid_slug",
      });
    }
  });

  it("rejects one below the minimum length (3)", () => {
    expect(validateVanitySlug("234")).toEqual({ ok: false, error: "invalid_slug" });
  });

  it("rejects one above the maximum length (31)", () => {
    expect(validateVanitySlug(SLUG_CHARSET + "2")).toEqual({ ok: false, error: "invalid_slug" });
  });

  it("accepts the length boundaries (4 and 30)", () => {
    expect(validateVanitySlug("2345")).toEqual({ ok: true, data: "2345" });
    expect(validateVanitySlug(SLUG_CHARSET)).toEqual({ ok: true, data: SLUG_CHARSET });
  });

  // NOTE (surprising finding, see the dedicated regression test below): "api"
  // is both too short (3 chars, MIN_SLUG_LENGTH is 4) and charset-invalid
  // ("I" isn't in SLUG_CHARSET), so validateVanitySlug's isValidSlug() gate
  // — which runs BEFORE the RESERVED_SLUGS check, per this function's spec —
  // rejects it as `invalid_slug` without ever consulting RESERVED_SLUGS.
  // "api"/"Api"/"API" ARE still rejected case-insensitively, as required;
  // the reserved-word blocklist just isn't the mechanism doing it here.
  it("rejects 'api' case-insensitively (via invalid_slug — see the RESERVED_SLUGS reachability test)", () => {
    expect(validateVanitySlug("api")).toEqual({ ok: false, error: "invalid_slug" });
    expect(validateVanitySlug("API")).toEqual({ ok: false, error: "invalid_slug" });
    expect(validateVanitySlug("Api")).toEqual({ ok: false, error: "invalid_slug" });
    expect(RESERVED_SLUGS.has("API")).toBe(true);
  });

  it("accepts a valid, non-reserved slug", () => {
    expect(validateVanitySlug("PARTY26")).toEqual({ ok: true, data: "PARTY26" });
  });

  // Regression pin for a real finding: every word currently in
  // RESERVED_SLUGS is either shorter than MIN_SLUG_LENGTH (4) or contains a
  // SLUG_CHARSET-excluded letter (I/L/O/U — e.g. ADMIN, DOCS, LOGIN, AUTH,
  // STUDIO, CODES, FAVICON all contain at least one), so `isValidSlug`
  // rejects every one of them as `invalid_slug` before `RESERVED_SLUGS.has()`
  // is ever reached — per this function's specified check order (isValidSlug
  // BEFORE the reserved check). The words are still effectively blocked
  // (callers can never register e.g. "STUDIO" as a slug), just via a
  // different, less specific error than `slug_reserved` — so this isn't a
  // trust/security gap, but the reserved-word branch itself is presently
  // dead code for the whole shipped list. Pinned here so a future charset
  // widening, MIN_SLUG_LENGTH change, or a newly-added reserved word that
  // happens to be charset-valid gets this branch exercised for real, rather
  // than the reserved check staying silently untested.
  it("[reconcile] every RESERVED_SLUGS entry is already unreachable via isValidSlug (dead reserved-word branch)", () => {
    for (const word of RESERVED_SLUGS) {
      const charsetOk = [...word].every((char) => SLUG_CHARSET.includes(char));
      const lengthOk = word.length >= 4 && word.length <= 30;
      expect(charsetOk && lengthOk).toBe(false);
    }
  });
});
