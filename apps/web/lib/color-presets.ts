// Pure preset-membership check shared by every color affordance in the
// Studio (P4 design-iteration note 2/3): a swatch row's rainbow "custom
// color" trigger only lights up (glowSwatchSelected) when the committed
// value ISN'T one of the caller's own presets — i.e. it represents the
// active custom color, not just an option to open one. Colocated-tested
// (color-presets.test.ts).

/** Case-insensitive membership check against a preset hex list. */
export function isPresetColor(value: string, presets: readonly string[]): boolean {
  const normalized = value.toLowerCase();
  return presets.some((preset) => preset.toLowerCase() === normalized);
}
