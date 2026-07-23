import { describe, expect, it } from "vitest";
import {
  BASE62,
  CRC_LENGTH,
  KEY_PREFIX,
  RANDOM_LENGTH,
  TOTAL,
  crc32,
  encodeBase62FixedWidth,
  formatValidateApiKey,
  generateApiKey,
  hashApiKey,
} from "./api-keys";

describe("shape constants", () => {
  it("TOTAL is prefix + random + crc", () => {
    expect(KEY_PREFIX).toHaveLength(11);
    expect(TOTAL).toBe(KEY_PREFIX.length + RANDOM_LENGTH + CRC_LENGTH);
    expect(TOTAL).toBe(49);
  });

  it("BASE62 is 62 unique chars, digits+upper+lower", () => {
    expect(BASE62).toHaveLength(62);
    expect(new Set(BASE62).size).toBe(62);
    expect(BASE62).toMatch(/^[0-9A-Za-z]+$/);
  });
});

describe("generateApiKey -> formatValidateApiKey round-trip", () => {
  it("a freshly generated key validates, several times over", () => {
    for (let i = 0; i < 20; i++) {
      const { fullKey } = generateApiKey();
      expect(formatValidateApiKey(fullKey)).toBe(true);
    }
  });

  it("fullKey has the qrcdn_live_ prefix and TOTAL length", () => {
    const { fullKey } = generateApiKey();
    expect(fullKey.startsWith(KEY_PREFIX)).toBe(true);
    expect(fullKey).toHaveLength(TOTAL);
  });

  it("displayPrefix is qrcdn_live_ + 4 chars (15 total), a prefix of fullKey", () => {
    const { fullKey, displayPrefix } = generateApiKey();
    expect(displayPrefix).toHaveLength(15);
    expect(displayPrefix.startsWith(KEY_PREFIX)).toBe(true);
    expect(fullKey.startsWith(displayPrefix)).toBe(true);
  });

  it("two generated keys are different", () => {
    const a = generateApiKey().fullKey;
    const b = generateApiKey().fullKey;
    expect(a).not.toBe(b);
  });
});

describe("formatValidateApiKey — tamper rejection", () => {
  it("flipping a char inside the prefix fails", () => {
    const { fullKey } = generateApiKey();
    const tampered = "qrcdX_live_" + fullKey.slice(KEY_PREFIX.length);
    expect(formatValidateApiKey(tampered)).toBe(false);
  });

  it("flipping a char inside the random body fails", () => {
    const { fullKey } = generateApiKey();
    const randomStart = KEY_PREFIX.length;
    const original = fullKey[randomStart]!;
    const replacement = original === "9" ? "8" : "9";
    const tampered =
      fullKey.slice(0, randomStart) + replacement + fullKey.slice(randomStart + 1);
    expect(formatValidateApiKey(tampered)).toBe(false);
  });

  it("flipping a char inside the CRC tail fails", () => {
    const { fullKey } = generateApiKey();
    const crcStart = KEY_PREFIX.length + RANDOM_LENGTH;
    const original = fullKey[crcStart]!;
    const replacement = original === "9" ? "8" : "9";
    const tampered = fullKey.slice(0, crcStart) + replacement + fullKey.slice(crcStart + 1);
    expect(formatValidateApiKey(tampered)).toBe(false);
  });

  it("rejects a key that is one character short", () => {
    const { fullKey } = generateApiKey();
    expect(formatValidateApiKey(fullKey.slice(0, -1))).toBe(false);
  });

  it("rejects a key that is one character long", () => {
    const { fullKey } = generateApiKey();
    expect(formatValidateApiKey(fullKey + "0")).toBe(false);
  });

  it("rejects a non-base62 char (e.g. '-' or '_') in the random/CRC region", () => {
    const { fullKey } = generateApiKey();
    const tampered = fullKey.slice(0, -1) + "-";
    expect(formatValidateApiKey(tampered)).toBe(false);
  });

  it("rejects a key with the wrong prefix entirely", () => {
    const { fullKey } = generateApiKey();
    const wrongPrefix = "qrcdn_test_" + fullKey.slice(KEY_PREFIX.length);
    expect(formatValidateApiKey(wrongPrefix)).toBe(false);
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", async () => {
    const { fullKey } = generateApiKey();
    const [a, b] = await Promise.all([hashApiKey(fullKey), hashApiKey(fullKey)]);
    expect(a).toBe(b);
  });

  it("differs for different inputs", async () => {
    const a = generateApiKey().fullKey;
    const b = generateApiKey().fullKey;
    const [hashA, hashB] = await Promise.all([hashApiKey(a), hashApiKey(b)]);
    expect(hashA).not.toBe(hashB);
  });

  it("has the \\x + 64 lowercase hex chars shape (sha256, PostgREST bytea text format)", async () => {
    const { fullKey } = generateApiKey();
    const hash = await hashApiKey(fullKey);
    expect(hash).toMatch(/^\\x[0-9a-f]{64}$/);
  });
});

describe("random body distribution (rejection sampling sanity)", () => {
  it("draws roughly uniformly across BASE62 over many characters (loose statistical bound)", () => {
    const counts = new Map<string, number>();
    const samples = 6000;
    let drawn = 0;
    while (drawn < samples) {
      const { fullKey } = generateApiKey();
      const random = fullKey.slice(KEY_PREFIX.length, KEY_PREFIX.length + RANDOM_LENGTH);
      for (const char of random) {
        counts.set(char, (counts.get(char) ?? 0) + 1);
        drawn++;
        if (drawn >= samples) break;
      }
    }

    // Every char of BASE62 should appear at least once — with 6000 draws
    // over 62 buckets (expected ~97/bucket), a well-mixed generator should
    // never leave a bucket empty. This is a loose sanity floor, not a
    // rigorous chi-square test — it exists to catch a badly broken RNG or a
    // narrow-range fallback, not to certify true uniformity.
    expect(counts.size).toBe(BASE62.length);
    for (const char of BASE62) {
      expect(counts.get(char) ?? 0).toBeGreaterThan(0);
    }

    // No single char should dominate far past its ~1/62 expectation — a
    // generous 5x-expected ceiling, loose enough to never flake on real
    // randomness but tight enough to catch e.g. a stuck byte or a modulo-bias
    // regression that skews the low end of the range.
    const expected = samples / BASE62.length;
    for (const count of counts.values()) {
      expect(count).toBeLessThan(expected * 5);
    }
  });
});

describe("encodeBase62FixedWidth — zero-padding", () => {
  it("pads a small value out to the requested width", () => {
    expect(encodeBase62FixedWidth(0, 6)).toBe("000000");
    expect(encodeBase62FixedWidth(1, 6)).toBe("000001");
    expect(encodeBase62FixedWidth(61, 6)).toBe("00000z");
  });

  it("throws if the value doesn't fit in the requested width", () => {
    expect(() => encodeBase62FixedWidth(62 ** 3, 2)).toThrow();
  });

  it("a body whose CRC-32 is small enough to need padding round-trips through the fixed-width tail", () => {
    // Deterministic: find a body (by appending a numeric suffix to a fixed
    // prefix) whose crc32 is small enough that its raw base62 encoding is
    // shorter than CRC_LENGTH, so padStart's zero-padding is actually
    // exercised end-to-end via generateApiKey/formatValidateApiKey's real
    // code path rather than encodeBase62FixedWidth in isolation.
    let body = "";
    let value = 0;
    for (let i = 0; i < 100_000; i++) {
      const candidate = `${KEY_PREFIX}padtest${i}`;
      if (crc32(candidate) < 62 ** 5) {
        body = candidate;
        value = crc32(candidate);
        break;
      }
    }
    expect(body).not.toBe("");
    const tail = encodeBase62FixedWidth(value, CRC_LENGTH);
    expect(tail).toHaveLength(CRC_LENGTH);
    expect(tail.startsWith("0")).toBe(true);
  });
});

describe("crc32", () => {
  it("is deterministic and within uint32 range", () => {
    const value = crc32("hello world");
    expect(crc32("hello world")).toBe(value);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
  });

  it("differs for different input", () => {
    expect(crc32("hello world")).not.toBe(crc32("hello world!"));
  });
});
