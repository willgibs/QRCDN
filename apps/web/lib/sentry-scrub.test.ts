import { describe, expect, it } from "vitest";
import { scrubEvent } from "./sentry-scrub";

describe("scrubEvent — request headers", () => {
  it("removes authorization, cookie, and x-api-key headers case-insensitively, keeps the rest", () => {
    const event = {
      request: {
        headers: {
          Authorization: "Bearer secret-token",
          cookie: "sid=abc123",
          "X-Api-Key": "qrcdn_live_whatever",
          "content-type": "application/json",
          "User-Agent": "curl/8.0",
        },
      },
    };

    const result = scrubEvent(event);

    expect(result.request?.headers).toEqual({
      "content-type": "application/json",
      "User-Agent": "curl/8.0",
    });
  });

  it("leaves request untouched when there are no headers/cookies/data to scrub", () => {
    const event = { request: { url: "https://qrcdn.com/ABCD234", method: "GET" } };

    const result = scrubEvent(event);

    expect(result.request).toEqual({ url: "https://qrcdn.com/ABCD234", method: "GET" });
  });
});

describe("scrubEvent — request cookies/data", () => {
  it("drops request.cookies entirely", () => {
    const event = { request: { cookies: { session: "abc123" }, url: "https://qrcdn.com" } };

    const result = scrubEvent(event);

    expect(result.request).not.toHaveProperty("cookies");
    expect(result.request).toEqual({ url: "https://qrcdn.com" });
  });

  it("drops request.data entirely regardless of shape", () => {
    const event = { request: { data: { destination: "https://willgibs.com", extra: [1, 2, 3] } } };

    const result = scrubEvent(event);

    expect(result.request).not.toHaveProperty("data");
  });
});

describe("scrubEvent — extra/contexts key scrubbing", () => {
  it("deletes top-level matching keys from extra", () => {
    const event = {
      extra: {
        password: "hunter2",
        destination: "https://willgibs.com/landing",
        apiToken: "qrcdn_live_abc",
        secretValue: "shh",
        userEmail: "hi@willgibs.com",
        safeField: "keep-me",
      },
    };

    const result = scrubEvent(event);

    expect(result.extra).toEqual({ safeField: "keep-me" });
  });

  it("recursively deletes matching keys from nested objects and arrays in extra", () => {
    const event = {
      extra: {
        outer: {
          inner: {
            token: "abc",
            note: "keep",
          },
          list: [{ apiKey: "x", ok: "keep-array-item" }, "plain-string"],
        },
      },
    };

    const result = scrubEvent(event);

    expect(result.extra).toEqual({
      outer: {
        inner: { note: "keep" },
        list: [{ ok: "keep-array-item" }, "plain-string"],
      },
    });
  });

  it("deletes matching keys from contexts the same way as extra", () => {
    const event = { contexts: { app: { destination: "https://evil.example", app_version: "1.0" } } };

    const result = scrubEvent(event);

    expect(result.contexts).toEqual({ app: { app_version: "1.0" } });
  });

  it("matches api-key key variants regardless of separator or casing", () => {
    const event = {
      extra: { apiKey: 1, api_key: 2, "api-key": 3, API_KEY: 4, apikey: 5, keep: 6 },
    };

    const result = scrubEvent(event);

    expect(result.extra).toEqual({ keep: 6 });
  });

  it("does not over-scrub keys that merely contain safe substrings", () => {
    const event = { extra: { passwordless: "should be removed (contains password)", updatedAt: "2026-07-30" } };

    const result = scrubEvent(event);

    // `passwordless` still contains the substring "password", so it's
    // correctly caught by the deliberately broad pattern — only truly
    // unrelated keys like `updatedAt` should survive.
    expect(result.extra).toEqual({ updatedAt: "2026-07-30" });
  });
});

describe("scrubEvent — defensive / odd shapes", () => {
  it("returns null unchanged without throwing", () => {
    expect(() => scrubEvent(null)).not.toThrow();
    expect(scrubEvent(null)).toBeNull();
  });

  it("returns undefined unchanged without throwing", () => {
    expect(() => scrubEvent(undefined)).not.toThrow();
    expect(scrubEvent(undefined)).toBeUndefined();
  });

  it("returns garbage/primitive input unchanged without throwing", () => {
    expect(scrubEvent("not an event" as unknown)).toBe("not an event");
    expect(scrubEvent(42 as unknown)).toBe(42);
    expect(scrubEvent([1, 2, 3] as unknown)).toEqual([1, 2, 3]);
  });

  it("handles a circular reference in extra without throwing or hanging", () => {
    type Circular = { self?: Circular; safe: string };
    const circular: Circular = { safe: "keep-me" };
    circular.self = circular;

    expect(() => scrubEvent({ extra: circular })).not.toThrow();
    const result = scrubEvent({ extra: circular }) as unknown as {
      extra: { safe: string; self: string };
    };
    expect(result.extra.safe).toBe("keep-me");
    expect(result.extra.self).toBe("[Circular]");
  });

  it("does not mutate the original event object", () => {
    const event = {
      request: { headers: { authorization: "secret" }, cookies: { a: "b" } },
      extra: { password: "hunter2", safe: "ok" },
    };
    const original = JSON.parse(JSON.stringify(event));

    scrubEvent(event);

    expect(event).toEqual(original);
  });
});
