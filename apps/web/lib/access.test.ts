import { describe, expect, it } from "vitest";
import { codeState, isCodeExpired } from "./access";

const NOW = new Date("2026-07-29T12:00:00.000Z");
const PAST = "2026-07-01T00:00:00.000Z";
const FUTURE = "2027-01-01T00:00:00.000Z";

describe("isCodeExpired", () => {
  it("is false when there is no expiry", () => {
    expect(isCodeExpired(null, NOW)).toBe(false);
    expect(isCodeExpired(undefined, NOW)).toBe(false);
  });

  it("is true only once the expiry has passed", () => {
    expect(isCodeExpired(PAST, NOW)).toBe(true);
    expect(isCodeExpired(FUTURE, NOW)).toBe(false);
  });

  it("treats the exact expiry instant as expired, matching the Worker", () => {
    // workers/redirect/src/redirect-decision.ts uses `now >= expiresAt`, so the
    // two layers must agree on the boundary or the UI and the redirect disagree.
    expect(isCodeExpired(NOW.toISOString(), NOW)).toBe(true);
  });

  it("fails safe (not expired) on an unparseable timestamp", () => {
    expect(isCodeExpired("not-a-date", NOW)).toBe(false);
  });
});

describe("codeState", () => {
  it("reports an expired-but-active-status code as expired, not active", () => {
    // The regression this helper exists for: qr_codes.status stays "active"
    // when an expiry passes, so labeling from status alone told the user a
    // dead code was live.
    expect(codeState("active", PAST, NOW)).toBe("expired");
  });

  it("reports a live code as active", () => {
    expect(codeState("active", FUTURE, NOW)).toBe("active");
    expect(codeState("active", null, NOW)).toBe("active");
  });

  it("prefers paused over expired, matching the Worker's decision order", () => {
    expect(codeState("paused", PAST, NOW)).toBe("paused");
  });

  it("prefers archived over everything", () => {
    expect(codeState("archived", PAST, NOW)).toBe("archived");
  });
});
