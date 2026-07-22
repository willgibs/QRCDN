"use client";

import { useId, useState, type ReactNode } from "react";
import { HexColorPicker } from "react-colorful";
import { hexColorSchema } from "@qrcdn/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { glowSwatchSelected } from "@/components/brand/glow-tile";
import { isPresetColor } from "@/lib/color-presets";
import { useRafThrottledCallback } from "@/hooks/use-raf-throttled-callback";
import { cn } from "@/lib/utils";

// Shared color-picking affordances for the Studio rail (P4 design-iteration
// note 2/3) — every color control (ink, paper, gradient start/end, eye
// color) is built from the same two pieces: `ColorField` (presets + rainbow
// picker + free-hex text field) and the more compact `ColorChipRow`
// (presets + rainbow picker, no text field, room for a leading chip like
// eye color's "Match ink"). Both share `ColorSwatches`/`RainbowTrigger` so
// there's exactly one place that renders a preset circle or the picker.

const RAINBOW_GRADIENT =
  "conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";

function isHex(value: string): boolean {
  return hexColorSchema.safeParse(value).success;
}

/** Rainbow trigger swatch + popover visual picker — the "custom color"
 *  affordance appended to every preset row. Same footprint as a preset
 *  swatch; lights up with `glowSwatchSelected` when the committed value
 *  isn't one of the caller's presets, i.e. it *is* the active custom color
 *  already, not just an option to become one. `value: null` (eye color's
 *  "match ink" state) never lights the trigger — a dedicated leading chip
 *  owns that indicator instead. Picker drags are rAF-throttled: `onChange`
 *  can fire many times per drag frame, and `renderQr` doesn't need more
 *  than one call per paint. */
function RainbowTrigger({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string | null;
  presets: readonly string[];
  onChange: (hex: string) => void;
}) {
  const isCustom = value !== null && !isPresetColor(value, presets);
  const safeColor = value !== null && isHex(value) ? value : "#111111";
  const throttledChange = useRafThrottledCallback(onChange);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Custom ${label.toLowerCase()} color`}
          aria-pressed={isCustom}
          style={{ backgroundImage: RAINBOW_GRADIENT }}
          className={cn(
            "size-6 shrink-0 rounded-full border border-border/60 transition-shadow duration-(--duration-fast) ease-(--motion-ease-out)",
            isCustom && glowSwatchSelected,
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-3 p-3">
        <HexColorPicker color={safeColor} onChange={throttledChange} />
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full border border-border/60"
            style={{ backgroundColor: safeColor }}
          />
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase tabular-nums">
            {safeColor}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Preset circles + the rainbow trigger — the body shared by `ColorField`
 *  and `ColorChipRow` so there's one implementation of "a row of color
 *  options" regardless of whether a hex text field sits next to it. */
function ColorSwatches({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string | null;
  presets: readonly string[];
  onChange: (hex: string) => void;
}) {
  return (
    <>
      {presets.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`${label} ${hex}`}
          aria-pressed={value !== null && value.toLowerCase() === hex}
          onClick={() => onChange(hex)}
          style={{ backgroundColor: hex }}
          className={cn(
            "size-6 shrink-0 rounded-full border border-border/60 transition-shadow duration-(--duration-fast) ease-(--motion-ease-out)",
            value !== null && value.toLowerCase() === hex && glowSwatchSelected,
          )}
        />
      ))}
      <RainbowTrigger label={label} value={value} presets={presets} onChange={onChange} />
    </>
  );
}

/** Swatch presets + rainbow picker + a free-hex text field, sharing one
 *  committed value. The text field tracks its own draft so a mid-typed,
 *  momentarily-invalid hex never reaches `renderQr` — only a value that
 *  passes `hexColorSchema` is ever pushed up via `onChange`. */
export function ColorField({
  label,
  value,
  onChange,
  presets,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets: readonly string[];
  /** Extra chip rendered after the rainbow trigger, before the hex input —
   *  e.g. Paper's transparent checker chip. */
  trailing?: ReactNode;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  // Reset the draft when `value` changes for a reason other than our own
  // `handleDraft` calls (e.g. a kit switch loading a new ink/paper color) —
  // adjusted during render per the React docs, not in an effect, so this
  // never trips `react-hooks/set-state-in-effect`.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  function handleDraft(next: string) {
    setDraft(next);
    if (isHex(next)) onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <ColorSwatches label={label} value={value} presets={presets} onChange={handleDraft} />
        {trailing}
        <div className="relative w-24 min-w-0 flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 rounded-full border border-border/60"
            style={{ backgroundColor: isHex(draft) ? draft : value }}
          />
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => handleDraft(e.target.value)}
            aria-invalid={!isHex(draft)}
            spellCheck={false}
            maxLength={7}
            className="h-8 pl-7 font-mono text-xs uppercase"
          />
        </div>
      </div>
    </div>
  );
}

/** Compact form: presets + rainbow trigger only, no hex text field, plus an
 *  optional leading chip (e.g. eye color's "Match ink"). Used where a full
 *  `ColorField` would balloon a row that should stay single-line —
 *  `value: null` means nothing here is the committed color (the leading
 *  chip owns that state instead), so no preset or the rainbow trigger shows
 *  as selected. */
export function ColorChipRow({
  label,
  value,
  onChange,
  presets,
  leading,
}: {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
  presets: readonly string[];
  leading?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {leading}
      <ColorSwatches label={label} value={value} presets={presets} onChange={onChange} />
    </div>
  );
}

// Quiet 2-tone checker, sized to match a preset swatch — the universal
// "transparent" affordance (Photoshop/Figma), built from `currentColor` so
// it reads correctly in both themes without a hardcoded gray.
const CHECKER_SQUARE_PX = 8;
const CHECKER_PATTERN =
  "conic-gradient(currentcolor 90deg, transparent 0 180deg, currentcolor 0 270deg, transparent 0)";

/** Paper row's "transparent background" chip — sets `background.transparent`
 *  per the schema. Selected state uses the same `glowSwatchSelected`
 *  treatment as every other swatch in the rail. */
export function TransparentPaperChip({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Transparent paper"
      aria-pressed={active}
      onClick={onClick}
      style={{
        backgroundImage: CHECKER_PATTERN,
        backgroundSize: `${CHECKER_SQUARE_PX}px ${CHECKER_SQUARE_PX}px`,
      }}
      className={cn(
        "size-6 shrink-0 rounded-full border border-border/60 bg-background text-muted-foreground/70 transition-shadow duration-(--duration-fast) ease-(--motion-ease-out)",
        active && glowSwatchSelected,
      )}
    />
  );
}
