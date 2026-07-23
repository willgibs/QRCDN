import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  isApiError: (x: unknown) => typeof x === "object" && x !== null && "status" in x,
}));
vi.mock("../../../../../lib/codes-core", () => ({
  getCodeBySlugCore: vi.fn(),
  retargetCodeCore: vi.fn(),
  setCodePausedCore: vi.fn(),
}));

import { authenticateApiRequest } from "../../../../../lib/api-auth";
import { getCodeBySlugCore, retargetCodeCore, setCodePausedCore } from "../../../../../lib/codes-core";
import { GET, PATCH } from "./route";

const authMock = vi.mocked(authenticateApiRequest);
const getBySlugMock = vi.mocked(getCodeBySlugCore);
const retargetMock = vi.mocked(retargetCodeCore);
const setPausedMock = vi.mocked(setCodePausedCore);

const AUTH_CTX = { db: {} as never, ownerId: "owner-1", apiKeyId: "key-1", plan: "pro" as const };

const CODE = {
  id: "code-1",
  slug: "ABCD234",
  name: "Menu",
  destination_url: "https://example.com/old",
  status: "active",
  scan_count: 7,
  created_at: "2026-01-01T00:00:00.000Z",
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
    });
    expect(retargetMock).toHaveBeenCalledWith(
      { db: AUTH_CTX.db, ownerId: "owner-1" },
      "code-1",
      "https://example.com/new",
    );
    expect(setPausedMock).not.toHaveBeenCalled();
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
    });
    expect(setPausedMock).toHaveBeenCalledWith({ db: AUTH_CTX.db, ownerId: "owner-1" }, "code-1", true);
    expect(retargetMock).not.toHaveBeenCalled();
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
    });
    expect(retargetMock.mock.invocationCallOrder[0]!).toBeLessThan(
      setPausedMock.mock.invocationCallOrder[0]!,
    );
  });
});
