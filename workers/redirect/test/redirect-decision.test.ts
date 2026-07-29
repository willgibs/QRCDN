import { describe, expect, it } from "vitest";
import type { KvSlugRecord } from "@qrcdn/shared";
import {
  buildKvBackfillRecord,
  decideRedirect,
  resolveCodeId,
  type RestLookupResult,
  type RestQrCodeRow,
} from "../src/redirect-decision";

const ACTIVE_ROW: RestQrCodeRow = {
  id: "code-1",
  destination_url: "https://example.com/landing",
  status: "active",
  expires_at: null,
  password_hash: null,
};
const PAUSED_ROW: RestQrCodeRow = { ...ACTIVE_ROW, status: "paused" };
const ARCHIVED_ROW: RestQrCodeRow = { ...ACTIVE_ROW, status: "archived" };
const EXPIRED_ROW: RestQrCodeRow = { ...ACTIVE_ROW, expires_at: "2020-01-01T00:00:00.000Z" };
const PROTECTED_ROW: RestQrCodeRow = { ...ACTIVE_ROW, password_hash: "$2b$hashed" };
const NOW = new Date("2026-07-29T00:00:00.000Z");

describe("decideRedirect — KV hit", () => {
  it("goes to the destination when the KV record is not paused", () => {
    const record: KvSlugRecord = { destination: "https://example.com", paused: false };
    expect(decideRedirect(record, null)).toEqual({
      kind: "destination",
      destination: "https://example.com",
    });
  });

  it("goes to unclaimed when the KV record is paused, ignoring any restResult", () => {
    const record: KvSlugRecord = { destination: "https://example.com", paused: true };
    expect(decideRedirect(record, { status: "found", row: ACTIVE_ROW })).toEqual({
      kind: "unclaimed",
    });
  });

  it("goes to unclaimed when the KV record is expired, even when paused=false", () => {
    const record: KvSlugRecord = {
      destination: "https://example.com",
      paused: false,
      expiresAt: "2020-01-01T00:00:00.000Z",
    };
    expect(decideRedirect(record, null, NOW)).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed when now is exactly equal to expiresAt (boundary)", () => {
    const record: KvSlugRecord = {
      destination: "https://example.com",
      paused: false,
      expiresAt: NOW.toISOString(),
    };
    expect(decideRedirect(record, null, NOW)).toEqual({ kind: "unclaimed" });
  });

  it("goes to password when the KV record is passwordProtected and unexpired", () => {
    const record: KvSlugRecord = {
      destination: "https://example.com",
      paused: false,
      passwordProtected: true,
    };
    expect(decideRedirect(record, null, NOW)).toEqual({ kind: "password" });
  });

  it("goes to unclaimed when the KV record is BOTH expired and protected (expiry outranks password)", () => {
    const record: KvSlugRecord = {
      destination: "https://example.com",
      paused: false,
      expiresAt: "2020-01-01T00:00:00.000Z",
      passwordProtected: true,
    };
    expect(decideRedirect(record, null, NOW)).toEqual({ kind: "unclaimed" });
  });

  it("old-shape KV record (neither expiresAt nor passwordProtected) behaves byte-identically to pre-P7.5-U1 (regression pin)", () => {
    const record: KvSlugRecord = { destination: "https://example.com", paused: false, codeId: "code-1" };
    expect(decideRedirect(record, null, NOW)).toEqual({
      kind: "destination",
      destination: "https://example.com",
    });
  });
});

describe("decideRedirect — KV miss, REST consulted", () => {
  it("goes to the destination when REST finds an active row", () => {
    const restResult: RestLookupResult = { status: "found", row: ACTIVE_ROW };
    expect(decideRedirect(null, restResult)).toEqual({
      kind: "destination",
      destination: "https://example.com/landing",
    });
  });

  it("goes to unclaimed when REST finds a paused row", () => {
    const restResult: RestLookupResult = { status: "found", row: PAUSED_ROW };
    expect(decideRedirect(null, restResult)).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed when REST finds an archived row (never stop redirecting, but not to the merchant's destination)", () => {
    const restResult: RestLookupResult = { status: "found", row: ARCHIVED_ROW };
    expect(decideRedirect(null, restResult)).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed when REST reports not-found", () => {
    expect(decideRedirect(null, { status: "not-found" })).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed (degraded but alive) when REST is unreachable", () => {
    expect(decideRedirect(null, { status: "unreachable" })).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed defensively when restResult is unexpectedly null on a KV miss", () => {
    expect(decideRedirect(null, null)).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed when REST finds an expired row, even though status is active", () => {
    const restResult: RestLookupResult = { status: "found", row: EXPIRED_ROW };
    expect(decideRedirect(null, restResult, NOW)).toEqual({ kind: "unclaimed" });
  });

  it("goes to unclaimed when now is exactly equal to expires_at (boundary)", () => {
    const row: RestQrCodeRow = { ...ACTIVE_ROW, expires_at: NOW.toISOString() };
    expect(decideRedirect(null, { status: "found", row }, NOW)).toEqual({ kind: "unclaimed" });
  });

  it("goes to password when REST finds a protected, unexpired row", () => {
    const restResult: RestLookupResult = { status: "found", row: PROTECTED_ROW };
    expect(decideRedirect(null, restResult, NOW)).toEqual({ kind: "password" });
  });

  it("goes to unclaimed when REST finds a row that is BOTH expired and protected (expiry outranks password)", () => {
    const row: RestQrCodeRow = { ...EXPIRED_ROW, password_hash: "$2b$hashed" };
    expect(decideRedirect(null, { status: "found", row }, NOW)).toEqual({ kind: "unclaimed" });
  });
});

describe("buildKvBackfillRecord", () => {
  it("carries destination, paused=false, and codeId for an active row", () => {
    expect(buildKvBackfillRecord(ACTIVE_ROW)).toEqual({
      destination: "https://example.com/landing",
      paused: false,
      codeId: "code-1",
    });
  });

  it("marks paused=true for a paused row, still carrying destination and codeId", () => {
    expect(buildKvBackfillRecord(PAUSED_ROW)).toEqual({
      destination: "https://example.com/landing",
      paused: true,
      codeId: "code-1",
    });
  });

  it("treats archived the same as paused for the paused flag", () => {
    expect(buildKvBackfillRecord(ARCHIVED_ROW).paused).toBe(true);
  });

  it("falls back to an empty string destination when destination_url is null", () => {
    const row: RestQrCodeRow = {
      id: "code-2",
      destination_url: null,
      status: "active",
      expires_at: null,
      password_hash: null,
    };
    expect(buildKvBackfillRecord(row).destination).toBe("");
  });

  it("omits expiresAt and passwordProtected entirely when the row has neither (exact-shape, regression pin)", () => {
    expect(buildKvBackfillRecord(ACTIVE_ROW)).toEqual({
      destination: "https://example.com/landing",
      paused: false,
      codeId: "code-1",
    });
  });

  it("sets expiresAt when the row has expires_at", () => {
    expect(buildKvBackfillRecord(EXPIRED_ROW)).toEqual({
      destination: "https://example.com/landing",
      paused: false,
      codeId: "code-1",
      expiresAt: "2020-01-01T00:00:00.000Z",
    });
  });

  it("sets passwordProtected=true when the row has a password_hash", () => {
    expect(buildKvBackfillRecord(PROTECTED_ROW)).toEqual({
      destination: "https://example.com/landing",
      paused: false,
      codeId: "code-1",
      passwordProtected: true,
    });
  });

  it("sets both when the row has both expires_at and password_hash", () => {
    const row: RestQrCodeRow = { ...EXPIRED_ROW, password_hash: "$2b$hashed" };
    expect(buildKvBackfillRecord(row)).toEqual({
      destination: "https://example.com/landing",
      paused: false,
      codeId: "code-1",
      expiresAt: "2020-01-01T00:00:00.000Z",
      passwordProtected: true,
    });
  });
});

describe("resolveCodeId", () => {
  it("prefers the KV record's codeId when present", () => {
    const record: KvSlugRecord = { destination: "x", paused: false, codeId: "from-kv" };
    expect(resolveCodeId(record, { status: "found", row: ACTIVE_ROW })).toBe("from-kv");
  });

  it("falls back to the REST row's id when the KV record lacks codeId", () => {
    // In the real flow a KV hit means restResult is null (REST was never
    // consulted) — this exercises the pure function's own fallback logic in
    // isolation, independent of how index.ts happens to call it today.
    const record: KvSlugRecord = { destination: "x", paused: false };
    expect(resolveCodeId(record, { status: "found", row: ACTIVE_ROW })).toBe("code-1");
  });

  it("is undefined when the KV record lacks codeId and restResult is null (old KV entry, real KV-hit flow)", () => {
    const record: KvSlugRecord = { destination: "x", paused: false };
    expect(resolveCodeId(record, null)).toBeUndefined();
  });

  it("uses the REST row's id on a KV miss with a found result", () => {
    expect(resolveCodeId(null, { status: "found", row: ACTIVE_ROW })).toBe("code-1");
  });

  it("is undefined when the slug is unclaimed (not-found)", () => {
    expect(resolveCodeId(null, { status: "not-found" })).toBeUndefined();
  });

  it("is undefined when REST is unreachable", () => {
    expect(resolveCodeId(null, { status: "unreachable" })).toBeUndefined();
  });
});
