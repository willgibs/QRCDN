import { describe, expect, it } from "vitest";
import { dailySaltInput, hashIp, toPgBytea } from "../src/scan-hash";

describe("dailySaltInput — date rotation", () => {
  it("builds a salt input from the scan salt and the UTC calendar date", () => {
    const now = new Date("2026-07-22T15:30:00.000Z");
    expect(dailySaltInput("my-secret", now)).toBe("my-secret:2026-07-22");
  });

  it("uses the UTC date even when the Date's local representation would differ", () => {
    // 2026-07-22T23:59:59Z is still July 22 in UTC no matter what timezone
    // the process happens to run in — toISOString() is always UTC.
    const now = new Date("2026-07-22T23:59:59.000Z");
    expect(dailySaltInput("my-secret", now)).toContain("2026-07-22");
  });

  it("rotates automatically at the UTC day boundary — no shared state needed", () => {
    const day1 = new Date("2026-07-22T23:59:59.999Z");
    const day2 = new Date("2026-07-23T00:00:00.000Z");
    expect(dailySaltInput("my-secret", day1)).not.toBe(dailySaltInput("my-secret", day2));
  });

  it("produces different salts for different secrets on the same day", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    expect(dailySaltInput("secret-a", now)).not.toBe(dailySaltInput("secret-b", now));
  });
});

describe("hashIp", () => {
  it("is deterministic for the same ip/salt/day", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const first = await hashIp("203.0.113.5", "my-secret", now);
    const second = await hashIp("203.0.113.5", "my-secret", now);
    expect(first).toBe(second);
  });

  it("produces a 64-char lowercase hex string (sha256 digest)", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const digest = await hashIp("203.0.113.5", "my-secret", now);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs across UTC days for the same ip (daily rotation is load-bearing, not cosmetic)", async () => {
    const day1 = await hashIp("203.0.113.5", "my-secret", new Date("2026-07-22T23:59:59.999Z"));
    const day2 = await hashIp("203.0.113.5", "my-secret", new Date("2026-07-23T00:00:00.000Z"));
    expect(day1).not.toBe(day2);
  });

  it("differs for different IPs on the same day", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const a = await hashIp("203.0.113.5", "my-secret", now);
    const b = await hashIp("203.0.113.6", "my-secret", now);
    expect(a).not.toBe(b);
  });

  it("never contains the raw IP in its output (hard rule: never store raw IPs)", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const digest = await hashIp("203.0.113.5", "my-secret", now);
    expect(digest).not.toContain("203");
    expect(digest).not.toContain("0.113.5");
  });
});

describe("toPgBytea", () => {
  it("prefixes the hex digest with the Postgres bytea hex-format marker", () => {
    expect(toPgBytea("deadbeef")).toBe("\\xdeadbeef");
  });
});
