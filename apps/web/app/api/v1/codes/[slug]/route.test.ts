import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  isApiError: (x: unknown) => typeof x === "object" && x !== null && "status" in x,
}));
vi.mock("../../../../../lib/codes-core", () => ({
  getCodeBySlugCore: vi.fn(),
  retargetCodeCore: vi.fn(),
  setCodeAccessCore: vi.fn(),
  setCodePausedCore: vi.fn(),
}));

import { authenticateApiRequest } from "../../../../../lib/api-auth";
import {
  getCodeBySlugCore,
  retargetCodeCore,
  setCodeAccessCore,
  setCodePausedCore,
} from "../../../../../lib/codes-core";
import { GET, PATCH } from "./route";

const authMock = vi.mocked(authenticateApiRequest);
const getBySlugMock = vi.mocked(getCodeBySlugCore);
const retargetMock = vi.mocked(retargetCodeCore);
const setPausedMock = vi.mocked(setCodePausedCore);
const setAccessMock = vi.mocked(setCodeAccessCore);

const AUTH_CTX = { db: {} as never, ownerId: "owner-1", apiKeyId: "key-1", plan: "pro" as const };

const CODE = {
  id: "code-1",
  slug: "ABCD234",
  name: "Menu",
  destination_url: "https://example.com/old",
  status: "active",
  scan_count: 7,
  created_at: "2026-01-01T00:00:00.000Z",
  expiresAt: null,
  passwordProtected: false,
};

function ctxFor(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function getRequest(slug: string): Request {
  return new Request(`https://www.qrcdn.com/api/v1/codes/${slug}`, {
    headers: { authorization: "Bearer irrelevant-mocked" },
  });
}

function patchRequest(slug: string, body: unknown): Request {
  return new Request(`https://www.qrcdn.com/api/v1/codes/${slug}`, {
    method: "PATCH",
    headers: { authorization: "Bearer irrelevant-mocked", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockReset();
  getBySlugMock.mockReset();
  retargetMock.mockReset();
  setPausedMock.mockReset();
  setAccessMock.mockReset();
  authMock.mockResolvedValue(AUTH_CTX);
});

describe("GET /api/v1/codes/[slug]", () => {
  it("404s not_found for an unowned or nonexistent slug", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: false, error: "not_found" });

    const response = await GET(getRequest("NOPE000"), ctxFor("NOPE000"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found", message: "Code not found." });
  });

  it("200s the api-code shape for an owned slug", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });

    const response = await GET(getRequest("ABCD234"), ctxFor("ABCD234"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      name: "Menu",
      destination: "https://example.com/old",
      status: "active",
      scanCount: 7,
      expiresAt: null,
      passwordProtected: false,
      url: "https://qrcdn.com/ABCD234",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("PATCH /api/v1/codes/[slug]", () => {
  it("422s empty_patch when neither field is supplied", async () => {
    const response = await PATCH(patchRequest("ABCD234", {}), ctxFor("ABCD234"));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request", message: "empty_patch" });
    expect(getBySlugMock).not.toHaveBeenCalled();
  });

  it("retargets destination-only, leaving status from the looked-up code", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    retargetMock.mockResolvedValueOnce({
      ok: true,
      data: { id: "code-1", destinationUrl: "https://example.com/new", kvSynced: true },
    });

    const response = await PATCH(
      patchRequest("ABCD234", { destination: "https://example.com/new" }),
      ctxFor("ABCD234"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      destination: "https://example.com/new",
      status: "active",
      expiresAt: null,
    });
    expect(retargetMock).toHaveBeenCalledWith(
      { db: AUTH_CTX.db, ownerId: "owner-1" },
      "code-1",
      "https://example.com/new",
    );
    expect(setPausedMock).not.toHaveBeenCalled();
    expect(setAccessMock).not.toHaveBeenCalled();
  });

  it("pauses paused-only, leaving destination from the looked-up code", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    setPausedMock.mockResolvedValueOnce({
      ok: true,
      data: { id: "code-1", status: "paused", kvSynced: true },
    });

    const response = await PATCH(patchRequest("ABCD234", { paused: true }), ctxFor("ABCD234"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      destination: "https://example.com/old",
      status: "paused",
      expiresAt: null,
    });
    expect(setPausedMock).toHaveBeenCalledWith({ db: AUTH_CTX.db, ownerId: "owner-1" }, "code-1", true);
    expect(retargetMock).not.toHaveBeenCalled();
    expect(setAccessMock).not.toHaveBeenCalled();
  });

  it("runs both writes sequentially — retarget before pause — and reflects both in the response", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    retargetMock.mockResolvedValueOnce({
      ok: true,
      data: { id: "code-1", destinationUrl: "https://example.com/new", kvSynced: true },
    });
    setPausedMock.mockResolvedValueOnce({
      ok: true,
      data: { id: "code-1", status: "paused", kvSynced: true },
    });

    const response = await PATCH(
      patchRequest("ABCD234", { destination: "https://example.com/new", paused: true }),
      ctxFor("ABCD234"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      destination: "https://example.com/new",
      status: "paused",
      expiresAt: null,
    });
    expect(retargetMock.mock.invocationCallOrder[0]!).toBeLessThan(
      setPausedMock.mock.invocationCallOrder[0]!,
    );
  });

  // P8-U5: destination_unsafe (retargetCodeCore's Safe Browsing screen) is
  // a caller-fixable 422, not a 500 — deliberately kept out of
  // UPDATE_INTERNAL_ERRORS (see route.ts's comment above that set).
  it("422s invalid_request when the core reports destination_unsafe on retarget", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    retargetMock.mockResolvedValueOnce({ ok: false, error: "destination_unsafe" });

    const response = await PATCH(
      patchRequest("ABCD234", { destination: "https://malicious.example.com" }),
      ctxFor("ABCD234"),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      message: "destination_unsafe",
    });
  });
});

describe("PATCH /api/v1/codes/[slug] — expiresAt (P7.5-U2)", () => {
  it("sets expiresAt on a Pro plan and reflects the normalized value in the response", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    setAccessMock.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "code-1",
        expiresAt: "2026-08-01T00:00:00.000Z",
        passwordProtected: false,
        kvSynced: true,
      },
    });

    const response = await PATCH(
      patchRequest("ABCD234", { expiresAt: "2026-08-01T00:00:00Z" }),
      ctxFor("ABCD234"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      destination: "https://example.com/old",
      status: "active",
      expiresAt: "2026-08-01T00:00:00.000Z",
    });
    // validateCodePatchInput normalizes the raw string to ISO-8601 before
    // setCodeAccessCore ever sees it.
    expect(setAccessMock).toHaveBeenCalledWith(
      { db: AUTH_CTX.db, ownerId: "owner-1" },
      "code-1",
      { expiresAt: "2026-08-01T00:00:00.000Z" },
    );
    expect(retargetMock).not.toHaveBeenCalled();
    expect(setPausedMock).not.toHaveBeenCalled();
  });

  it("403s plan_required on a free plan without touching destination/status", async () => {
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: CODE });
    setAccessMock.mockResolvedValueOnce({ ok: false, error: "plan_required" });

    const response = await PATCH(patchRequest("ABCD234", { expiresAt: null }), ctxFor("ABCD234"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "plan_required",
      message: "Access controls are a Pro feature.",
    });
  });

  it("expiresAt: null clears the expiry", async () => {
    const expiring = { ...CODE, expiresAt: "2026-01-01T00:00:00.000Z" };
    getBySlugMock.mockResolvedValueOnce({ ok: true, data: expiring });
    setAccessMock.mockResolvedValueOnce({
      ok: true,
      data: { id: "code-1", expiresAt: null, passwordProtected: false, kvSynced: true },
    });

    const response = await PATCH(patchRequest("ABCD234", { expiresAt: null }), ctxFor("ABCD234"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      destination: "https://example.com/old",
      status: "active",
      expiresAt: null,
    });
    expect(setAccessMock).toHaveBeenCalledWith(
      { db: AUTH_CTX.db, ownerId: "owner-1" },
      "code-1",
      { expiresAt: null },
    );
  });

  it("422s invalid_expiry for an unparseable expiresAt, never reaching the code lookup", async () => {
    const response = await PATCH(
      patchRequest("ABCD234", { expiresAt: "not a date" }),
      ctxFor("ABCD234"),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      message: "invalid_expiry",
    });
    expect(getBySlugMock).not.toHaveBeenCalled();
    expect(setAccessMock).not.toHaveBeenCalled();
  });
});
