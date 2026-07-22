import { describe, expect, it } from "vitest";
import { printedShortUrl } from "./short-url";

describe("printedShortUrl", () => {
  it("builds the uppercase apex short URL for a slug", () => {
    expect(printedShortUrl("K7M2X9A")).toBe("HTTPS://QRCDN.COM/K7M2X9A");
  });

  it("does not alter the slug's own casing", () => {
    // Slugs are always uppercase in practice (lib/slug.ts's SLUG_CHARSET),
    // but this helper is a plain template — it has no opinion of its own.
    expect(printedShortUrl("abc123")).toBe("HTTPS://QRCDN.COM/abc123");
  });
});
