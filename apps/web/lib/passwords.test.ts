import { describe, expect, it } from "vitest";
import { scrypt } from "node:crypto";
import { promisify } from "node:util";
import { hashCodePassword, verifyCodePassword } from "./passwords";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keyLen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

describe("hashCodePassword -> verifyCodePassword round-trip", () => {
  it("a freshly hashed password verifies against itself", async () => {
    const stored = await hashCodePassword("correct horse battery staple");
    await expect(verifyCodePassword("correct horse battery staple", stored)).resolves.toBe(true);
  });

  it("the wrong password fails verification", async () => {
    const stored = await hashCodePassword("correct horse battery staple");
    await expect(verifyCodePassword("wrong guess entirely", stored)).resolves.toBe(false);
  });

  it("hashing the same password twice produces two different stored strings (random salt)", async () => {
    const a = await hashCodePassword("same password");
    const b = await hashCodePassword("same password");
    expect(a).not.toBe(b);
    // Both still verify independently — the difference is the salt, not
    // silent corruption of one of the two hashes.
    await expect(verifyCodePassword("same password", a)).resolves.toBe(true);
    await expect(verifyCodePassword("same password", b)).resolves.toBe(true);
  });

  it("the stored string has the scrypt$N$r$p$salt$hash shape", async () => {
    const stored = await hashCodePassword("shape check");
    const parts = stored.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toBe("32768"); // 2**15
    expect(parts[2]).toBe("8");
    expect(parts[3]).toBe("1");
  });

  // Coverage for the explicit maxmem bump (see passwords.ts's SCRYPT_MAXMEM
  // comment): N=2**15/r=8 sits exactly at Node's 32 MiB default maxmem with
  // zero headroom, which is what the explicit 64 MiB override exists to
  // fix. This round-trip at the real N/r/p is the practical assertion that
  // hashing at this cost doesn't throw — a mocked-options assertion would
  // just restate the constant, not prove the option is load-bearing.
  it("hashes and verifies at the real N=2**15 cost without throwing", async () => {
    const stored = await hashCodePassword("full cost round trip");
    expect(stored.split("$")[1]).toBe("32768");
    await expect(verifyCodePassword("full cost round trip", stored)).resolves.toBe(true);
  });
});

describe("verifyCodePassword — malformed stored strings fail closed", () => {
  const malformed = [
    ["empty string", ""],
    ["wrong segment count", "scrypt$32768$8$1$onlyfoursegments"],
    ["wrong prefix", "bcrypt$32768$8$1$c29tZXNhbHQ=$c29tZWhhc2g="],
    ["non-numeric N", "scrypt$notanumber$8$1$c29tZXNhbHQ=$c29tZWhhc2g="],
    ["absurd N over the cap", `scrypt$${2 ** 21}$8$1$c29tZXNhbHQ=$c29tZWhhc2g=`],
    ["zero N", "scrypt$0$8$1$c29tZXNhbHQ=$c29tZWhhc2g="],
    ["negative r", "scrypt$32768$-8$1$c29tZXNhbHQ=$c29tZWhhc2g="],
    ["empty salt segment", "scrypt$32768$8$1$$c29tZWhhc2g="],
  ] as const;

  it.each(malformed)("returns false, never throws, for: %s", async (_label, stored) => {
    await expect(verifyCodePassword("any password", stored)).resolves.toBe(false);
  });
});

describe("verifyCodePassword — params read from the stored string, not module constants", () => {
  it("a hand-built hash at a different (still valid) N/r/p still verifies", async () => {
    // Deliberately NOT the module's SCRYPT_N/R/P (2**15/8/1) — a smaller,
    // cheap-to-compute cost so this test stays fast, while still proving
    // verifyCodePassword reads N/r/p from the string itself rather than
    // assuming its own current constants. If verify ever started using its
    // own SCRYPT_N/R/P instead of the parsed ones, this would fail (or
    // silently derive a different-length key).
    const n = 2 ** 10;
    const r = 4;
    const p = 1;
    const keyLen = 32;
    const salt = Buffer.from("0123456789abcdef", "utf8");
    const derived = await scryptAsync("hand built", salt, keyLen, { N: n, r, p, maxmem: 8 * 1024 * 1024 });
    const stored = ["scrypt", n, r, p, salt.toString("base64"), derived.toString("base64")].join("$");

    await expect(verifyCodePassword("hand built", stored)).resolves.toBe(true);
    await expect(verifyCodePassword("wrong password", stored)).resolves.toBe(false);
  });
});
