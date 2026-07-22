import { describe, expect, it } from "vitest";
import { SLUG_CHARSET, SLUG_LENGTH, generateSlug, isValidSlug } from "./slug";

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
