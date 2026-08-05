"use client";

import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, Upload, X } from "lucide-react";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eyebrow } from "@/components/brand/magic";
import { glowTileOn } from "@/components/brand/glow-tile";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { ColorChipRow, ColorField, TransparentPaperChip } from "@/components/studio/color-controls";
import { radiansToDegrees } from "@/lib/angle";
import {
  LOGO_SIZE_RATIO_MAX,
  LOGO_SIZE_RATIO_MIN,
  logoValidationMessage,
  validateLogoFile,
} from "@/lib/logo";
import { cn } from "@/lib/utils";

const INK_PRESETS = ["#131316", "#312e81", "#1e3a8a", "#0f766e", "#b91c1c"] as const;
const PAPER_PRESETS = ["#ffffff", "#f4f4f5", "#101013", "#18181b"] as const;
const EXPORT_SIZES = [512, 1024, 2048, 4096] as const;
const ECC_LEVELS = ["L", "M", "Q", "H"] as const;
const FILL_MODES = ["solid", "gradient"] as const;

/**
 * Cluster-level heading (P9.5-T7) — one tier above each section's own
 * `Eyebrow`, grouping the rail's existing sections into two labelled
 * clusters without changing any control inside them. Deliberately a
 * different register from `Eyebrow` (bolder, `text-foreground` instead of
 * muted, no `ModuleMark` glyph) so the two heading tiers read as a real
 * hierarchy rather than two same-weight labels stacked on top of each
 * other.
 */
function ClusterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-[13px] font-semibold uppercase tracking-[0.15em] text-foreground">
      {children}
    </h2>
  );
}

export function ControlsRail({
  style,
  payload,
  effectiveEcc,
  onPayloadChange,
  onInkChange,
  onPaperChange,
  onFillTypeChange,
  onGradientStartChange,
  onGradientEndChange,
  onGradientRotationChange,
  onDotStyleChange,
  onEyeFrameChange,
  onEyeColorChange,
  onPaperTransparentChange,
  onEccChange,
  onLogoFileSelected,
  onLogoRemove,
  onLogoSizeChange,
  onExportSvg,
  onExportPng,
  className,
}: {
  style: QrStyle;
  payload: string;
  /** The ECC level the engine will actually encode with (qr-engine's
   *  `effectiveEcc`) — may differ from `style.ecc` when a logo forces it
   *  higher; the Export section's helper text reflects that honestly. */
  effectiveEcc: QrStyle["ecc"];
  onPayloadChange: (value: string) => void;
  onInkChange: (hex: string) => void;
  onPaperChange: (hex: string) => void;
  onFillTypeChange: (mode: "solid" | "gradient") => void;
  onGradientStartChange: (hex: string) => void;
  onGradientEndChange: (hex: string) => void;
  /** Degrees (0-360) — converted to the schema's radians at the style
   *  boundary, one level up in studio-shell.tsx. */
  onGradientRotationChange: (degrees: number) => void;
  onDotStyleChange: (value: QrStyle["dots"]["style"]) => void;
  onEyeFrameChange: (value: QrStyle["eyes"]["frame"]) => void;
  /** `null` = "Match ink" (schema's own inherit-foreground-fill semantics). */
  onEyeColorChange: (hex: string | null) => void;
  onPaperTransparentChange: (transparent: boolean) => void;
  onEccChange: (value: QrStyle["ecc"]) => void;
  /** Resolves to an error message on failure, `null` on success — lets the
   *  rail surface a rare FileReader failure without lifting error UI state
   *  up to studio-shell. */
  onLogoFileSelected: (file: File) => Promise<string | null>;
  onLogoRemove: () => void;
  onLogoSizeChange: (ratio: number) => void;
  onExportSvg: () => void;
  onExportPng: (size: number) => Promise<void>;
  className?: string;
}) {
  const payloadId = useId();
  const sizeId = useId();
  const logoSizeId = useId();
  const gradientAngleId = useId();
  const [exportSize, setExportSize] = useState<string>("1024");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const fillMode: (typeof FILL_MODES)[number] = style.fill.type === "solid" ? "solid" : "gradient";

  async function handleLogoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;
    const validation = validateLogoFile(file);
    if (!validation.ok) {
      setLogoError(logoValidationMessage(validation.error));
      return;
    }
    setLogoError(null);
    const readError = await onLogoFileSelected(file);
    if (readError) setLogoError(readError);
  }

  function handleRemoveLogo() {
    setLogoError(null);
    onLogoRemove();
  }

  function handleExportSvgClick() {
    if (exporting) return;
    setExportError(null);
    setExporting("svg");
    try {
      onExportSvg();
    } catch {
      setExportError("Couldn't export. Try again.");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPngClick() {
    if (exporting) return;
    setExportError(null);
    setExporting("png");
    try {
      await onExportPng(Number(exportSize));
    } catch {
      setExportError("Couldn't export. Try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      {/* "Design" cluster (P9.5-T7) — shape, eyes, ink, logo. Regrouping
          only: every control below is byte-identical to its pre-T7 section,
          just gathered under one cluster heading instead of standing alone. */}
      <div className="flex flex-col gap-8">
        <ClusterHeading>Design</ClusterHeading>

        <section className="flex flex-col gap-4">
          <Eyebrow>Colors</Eyebrow>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              {/* P9.5-T7 review round 1: this labeled the fill-MODE toggle
                  "Ink" — the same word the color field two lines below
                  (line 233 in solid mode) also uses for the actual color,
                  so the rail rendered "Ink" twice in a row (pre-existing,
                  confirmed via `git show c664380` — predates this unit,
                  fixed here anyway). "Fill" names what this control
                  actually picks (solid vs. gradient); "Ink" stays reserved
                  for the real color field(s) below. */}
              <Label>Fill</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={fillMode}
                onValueChange={(v) => v && onFillTypeChange(v as "solid" | "gradient")}
              >
                {FILL_MODES.map((mode) => (
                  <ToggleGroupItem
                    key={mode}
                    value={mode}
                    aria-label={`${mode} ink`}
                    className={cn(glowTileOn, "px-2.5 text-xs capitalize")}
                  >
                    {mode}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {style.fill.type === "solid" ? (
              <ColorField label="Ink" value={style.fill.color} onChange={onInkChange} presets={INK_PRESETS} />
            ) : (
              <div className="flex flex-col gap-3">
                <ColorField
                  label="Start"
                  value={style.fill.stops[0]?.color ?? "#111111"}
                  onChange={onGradientStartChange}
                  presets={INK_PRESETS}
                />
                <ColorField
                  label="End"
                  value={style.fill.stops[style.fill.stops.length - 1]?.color ?? "#111111"}
                  onChange={onGradientEndChange}
                  presets={INK_PRESETS}
                />
                {style.fill.type === "linearGradient" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={gradientAngleId}>Angle</Label>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {Math.round(radiansToDegrees(style.fill.rotation))}°
                      </span>
                    </div>
                    <Slider
                      id={gradientAngleId}
                      min={0}
                      max={360}
                      step={1}
                      value={[Math.round(radiansToDegrees(style.fill.rotation))]}
                      onValueChange={([v]) => v !== undefined && onGradientRotationChange(v)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <ColorField
            label="Paper"
            value={style.background.color}
            onChange={onPaperChange}
            presets={PAPER_PRESETS}
            trailing={
              <TransparentPaperChip
                active={style.background.transparent}
                onClick={() => onPaperTransparentChange(!style.background.transparent)}
              />
            }
          />
        </section>

        <section className="flex flex-col gap-4">
          <Eyebrow>Shape</Eyebrow>
          <div className="flex flex-col gap-2">
            <Label>Module</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={style.dots.style}
              onValueChange={(v) => v && onDotStyleChange(v as QrStyle["dots"]["style"])}
            >
              {DOT_STYLES.map((s) => (
                <ToggleGroupItem key={s} value={s} aria-label={`${s} modules`} className={glowTileOn}>
                  <DotSwatch style={s} />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Eye</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={style.eyes.frame}
              onValueChange={(v) => v && onEyeFrameChange(v as QrStyle["eyes"]["frame"])}
            >
              {EYE_FRAMES.map((f) => (
                <ToggleGroupItem key={f} value={f} aria-label={`${f} eyes`} className={glowTileOn}>
                  <EyeSwatch frame={f} />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Eye color</Label>
            <ColorChipRow
              label="Eye"
              value={style.eyes.color}
              onChange={onEyeColorChange}
              presets={INK_PRESETS}
              leading={
                <button
                  type="button"
                  aria-pressed={style.eyes.color === null}
                  onClick={() => onEyeColorChange(null)}
                  className={cn(
                    "shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground",
                    style.eyes.color === null &&
                      "border-primary/50 bg-accent text-accent-foreground shadow-sm shadow-primary/10",
                  )}
                >
                  Match ink
                </button>
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Eyebrow>Logo</Eyebrow>
          {style.logo ? (
            <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
              <span
                aria-hidden
                className="size-9 shrink-0 rounded-md border border-border/60 bg-background bg-contain bg-center bg-no-repeat p-1"
                style={{ backgroundImage: `url(${style.logo.assetId})` }}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-xs text-foreground">Logo attached</span>
                <span className="text-xs text-muted-foreground">Knockout keeps it scannable</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove logo"
                onClick={handleRemoveLogo}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:border-primary/50 hover:text-foreground">
              <Upload className="size-4" aria-hidden />
              <span>Drop a PNG, JPEG, or WebP, or click to browse</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoInputChange}
                className="sr-only"
                aria-label="Upload logo"
              />
            </label>
          )}
          {logoError && (
            <p role="alert" className="text-xs text-destructive">
              {logoError}
            </p>
          )}
          {style.logo && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={logoSizeId}>Size</Label>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {Math.round(style.logo.sizeRatio * 100)}%
                </span>
              </div>
              <Slider
                id={logoSizeId}
                min={LOGO_SIZE_RATIO_MIN}
                max={LOGO_SIZE_RATIO_MAX}
                step={0.01}
                value={[style.logo.sizeRatio]}
                onValueChange={([v]) => v !== undefined && onLogoSizeChange(v)}
              />
            </div>
          )}
        </section>
      </div>

      {/* "Preview & export" cluster (P9.5-T7 heading; renamed P9.8-B2 once
          creation moved to /codes and the studio went kits-only) — the
          Destination input is a PREVIEW only now (it feeds the live QR on
          stage; it no longer mints anything), plus Export. Export stays the
          rail's last section (bottom placement already satisfied pre-T7 —
          see that unit's report; not re-done here, just preserved by
          keeping this cluster second). */}
      <div className="flex flex-col gap-8 border-t border-border/60 pt-8">
        <ClusterHeading>Preview & export</ClusterHeading>

        <section className="flex flex-col gap-3">
          <Eyebrow>Payload</Eyebrow>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={payloadId}>Destination</Label>
            <Input
              id={payloadId}
              value={payload}
              onChange={(e) => onPayloadChange(e.target.value)}
              placeholder="https://example.com"
              spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
          {/* P9.8-B2: creation moved to /codes (board: "bulk codes may get
              annoying to handle under a kit in the studio") — this is the
              one pointer left where CreateCodeControl/BulkCreateDialog used
              to live, so the flow change stays discoverable from here. */}
          <Link
            href="/codes"
            className="w-fit font-mono text-xs text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            Create codes on the Codes page →
          </Link>
        </section>

        <section className="flex flex-col gap-3 pb-2">
          <Eyebrow>Export</Eyebrow>
          <div className="flex flex-col gap-1.5">
            <Label>Error correction</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={style.ecc}
              onValueChange={(v) => v && onEccChange(v as QrStyle["ecc"])}
            >
              {ECC_LEVELS.map((level) => (
                <ToggleGroupItem
                  key={level}
                  value={level}
                  aria-label={`Error correction ${level}`}
                  className={cn(glowTileOn, "flex-1 font-mono text-xs")}
                >
                  {level}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Higher levels survive more print damage but pack modules denser.
              {effectiveEcc !== style.ecc && ` Auto-raised to ${effectiveEcc}: a logo is set.`}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={sizeId}>Size</Label>
            <Select value={exportSize} onValueChange={setExportSize}>
              <SelectTrigger id={sizeId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} × {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={exporting !== null}
              onClick={handleExportSvgClick}
            >
              {exporting === "svg" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {exporting === "svg" ? "Exporting" : "Download SVG"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={exporting !== null}
              onClick={handleExportPngClick}
            >
              {exporting === "png" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {exporting === "png" ? "Rasterizing" : "Download PNG"}
            </Button>
          </div>
          {exportError && (
            <p role="alert" className="text-xs text-destructive">
              {exportError}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
