import { describe, expect, it } from "vitest";
import { exportFilename, slugifyPayload } from "./export";

describe("slugifyPayload", () => {
  it("lowercases and hyphenates a URL payload", () => {
    expect(slugifyPayload("HTTPS://QRCDN.COM/PREVIEW")).toBe("https-qrcdn-com-preview");
  });

  it("collapses runs of non-alphanumeric characters into one hyphen", () => {
    expect(slugifyPayload("hello   world!!!")).toBe("hello-world");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyPayload("  ---wifi:S:home---  ")).toBe("wifi-s-home");
  });

  it("falls back to qr-code for an empty payload", () => {
    expect(slugifyPayload("")).toBe("qr-code");
  });

  it("falls back to qr-code for a payload with no alphanumeric characters", () => {
    expect(slugifyPayload("::://///")).toBe("qr-code");
  });

  it("caps length at the filename snippet max without trailing hyphen", () => {
    const long = "a".repeat(50);
    const result = slugifyPayload(long);
    expect(result.length).toBeLessThanOrEqual(32);
    expect(result.endsWith("-")).toBe(false);
  });

  it("truncation never leaves a dangling trailing hyphen", () => {
    // Constructed so the 32-char cut point lands exactly on a hyphen: 31
    // a's + a hyphen at index 31, then b's beyond the cutoff.
    const payload = "a".repeat(31) + " " + "b".repeat(10);
    const result = slugifyPayload(payload);
    expect(result).toBe("a".repeat(31));
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("exportFilename", () => {
  it("builds a qrcdn-prefixed svg filename", () => {
    expect(exportFilename("https://qrcdn.com/preview", "svg")).toBe(
      "qrcdn-https-qrcdn-com-preview.svg",
    );
  });

  it("builds a qrcdn-prefixed png filename", () => {
    expect(exportFilename("https://qrcdn.com/preview", "png")).toBe(
      "qrcdn-https-qrcdn-com-preview.png",
    );
  });

  it("still produces a valid filename for an empty payload", () => {
    expect(exportFilename("", "png")).toBe("qrcdn-qr-code.png");
  });
});
