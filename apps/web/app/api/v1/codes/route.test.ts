import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultQrStyle } from "@qrcdn/shared";

// Relative-import mock specifiers, matching route.ts's own imports exactly
// (vitest has no tsconfig-paths plugin — see app/api/cron/purge/route.test.ts).
vi.mock("../../../../lib/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
  isApiError: (x: unknown) => typeof x === "object" && x !== null && "status" in x,
}));
vi.mock("../../../../lib/codes-core", () => ({
  createDynamicCodeCore: vi.fn(),
  listDynamicCodesCore: vi.fn(),
}));

import { authenticateApiRequest } from "../../../../lib/api-auth";
import { createDynamicCodeCore, listDynamicCodesCore } from "../../../../lib/codes-core";
import { GET, POST } from "./route";

const authMock = vi.mocked(authenticateApiRequest);
const createMock = vi.mocked(createDynamicCodeCore);
const listMock = vi.mocked(listDynamicCodesCore);

const AUTH_CTX = { db: {} as never, ownerId: "owner-1", apiKeyId: "key-1", plan: "pro" as const };
const AUTH_ERROR = { status: 401, body: { error: "unauthorized", message: "Invalid API key." } };

function getRequest(): Request {
  return new Request("https://www.qrcdn.com/api/v1/codes", {
    headers: { authorization: "Bearer irrelevant-mocked" },
  });
}

function postRequest(rawBody: string): Request {
  return new Request("https://www.qrcdn.com/api/v1/codes", {
    method: "POST",
    headers: { authorization: "Bearer irrelevant-mocked", "content-type": "application/json" },
    body: rawBody,
  });
}

beforeEach(() => {
  authMock.mockReset();
  createMock.mockReset();
  listMock.mockReset();
  authMock.mockResolvedValue(AUTH_CTX);
});

describe("GET /api/v1/codes", () => {
  it("200s with { codes: [...] } mapped to the camelCase api-code shape, url lowercase", async () => {
    listMock.mockResolvedValueOnce({
      ok: true,
      data: [
        {
          id: "code-1",
          slug: "ABCD234",
          name: "Menu",
          destination_url: "https://example.com/menu",
          status: "active",
          scan_count: 5,
          created_at: "2026-01-01T00:00:00.000Z",
          expiresAt: null,
          passwordProtected: false,
        },
      ],
    });

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      codes: [
        {
          slug: "ABCD234",
          name: "Menu",
          destination: "https://example.com/menu",
          status: "active",
          scanCount: 5,
          expiresAt: null,
          passwordProtected: false,
          // Lowercase scheme+host; slug case preserved as stored — NOT
          // lib/short-url.ts's uppercase printedShortUrl form.
          url: "https://qrcdn.com/ABCD234",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(listMock).toHaveBeenCalledWith({ db: AUTH_CTX.db, ownerId: "owner-1" });
  });

  it("forwards an auth failure without calling the core", async () => {
    authMock.mockResolvedValueOnce(AUTH_ERROR);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(AUTH_ERROR.body);
    expect(listMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/codes", () => {
  it("201s with the api-code shape on success, defaulting a missing style to defaultQrStyle", async () => {
    createMock.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "code-1",
        owner_id: "owner-1",
        slug: "ABCD234",
        name: "Menu",
        destination_url: "https://example.com/menu",
        status: "active",
        scan_count: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        expires_at: null,
        password_hash: null,
      } as never,
    });

    const response = await POST(postRequest(JSON.stringify({ name: "Menu", destination: "https://example.com/menu" })));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      slug: "ABCD234",
      name: "Menu",
      destination: "https://example.com/menu",
      status: "active",
      scanCount: 0,
      expiresAt: null,
      passwordProtected: false,
      url: "https://qrcdn.com/ABCD234",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(createMock).toHaveBeenCalledWith(
      { db: AUTH_CTX.db, ownerId: "owner-1" },
      { name: "Menu", destination: "https://example.com/menu", style: defaultQrStyle },
    );
  });

  it("422s invalid_request on malformed JSON, without calling the core", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      message: "Malformed JSON body.",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("403s code_limit_reached when the core reports code_limit", async () => {
    createMock.mockResolvedValueOnce({ ok: false, error: "code_limit" });

    const response = await POST(
      postRequest(JSON.stringify({ name: "Menu", destination: "https://example.com" })),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "code_limit_reached",
      message: "You have reached your plan's dynamic code limit.",
    });
  });

  it("422s invalid_request surfacing the core's validation error string", async () => {
    createMock.mockResolvedValueOnce({ ok: false, error: "invalid_destination" });

    const response = await POST(postRequest(JSON.stringify({ name: "Menu", destination: "not-a-url" })));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      message: "invalid_destination",
    });
  });
});
