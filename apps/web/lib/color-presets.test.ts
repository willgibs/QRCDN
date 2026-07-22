import { describe, expect, it } from "vitest";
import { isPresetColor } from "./color-presets";

const PRESETS = ["#131316", "#312e81", "#1e3a8a"] as const;

describe("isPresetColor", () => {
  it("matches an exact preset", () => {
    expect(isPresetColor("#131316", PRESETS)).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isPresetColor("#312E81", PRESETS)).toBe(true);
    expect(isPresetColor("#312e81", PRESETS)).toBe(true);
  });

  it("returns false for a custom color not in the preset list", () => {
    expect(isPresetColor("#ff00ff", PRESETS)).toBe(false);
  });

  it("returns false against an empty preset list", () => {
    expect(isPresetColor("#131316", [])).toBe(false);
  });
});
