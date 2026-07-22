"use client";

import { useId, useState, type ChangeEvent } from "react";
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
import { ColorField } from "@/components/studio/color-controls";
import {
  LOGO_SIZE_RATIO_MAX,
  LOGO_SIZE_RATIO_MIN,
  logoValidationMessage,
  validateLogoFile,
} from "@/lib/logo";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { cn } from "@/lib/utils";

const INK_PRESETS = ["#131316", "#312e81", "#1e3a8a", "#0f766e", "#b91c1c"] as const;
const PAPER_PRESETS = ["#ffffff", "#f4f4f5", "#101013", "#18181b"] as const;
const EXPORT_SIZES = [512, 1024, 2048, 4096] as const;

export function ControlsRail({
  style,
  payload,
  onPayloadChange,
  onInkChange,
  onPaperChange,
  onDotStyleChange,
  onEyeFrameChange,
  onLogoFileSelected,
  onLogoRemove,
  onLogoSizeChange,
  onExportSvg,
  onExportPng,
  className,
}: {
  style: QrStyle;
  payload: string;
  onPayloadChange: (value: string) => void;
  onInkChange: (hex: string) => void;
  onPaperChange: (hex: string) => void;
  onDotStyleChange: (value: QrStyle["dots"]["style"]) => void;
  onEyeFrameChange: (value: QrStyle["eyes"]["frame"]) => void;
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
  const [exportSize, setExportSize] = useState<string>("1024");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const inkValue = inkHexFromStyle(style);

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
      setExportError("Couldn't export — try again.");
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
      setExportError("Couldn't export — try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-8", className)}>
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
        <p className="text-xs text-muted-foreground">
          Static preview only — dynamic codes with retargeting land in P5.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <Eyebrow>Colors</Eyebrow>
        <ColorField label="Ink" value={inkValue} onChange={onInkChange} presets={INK_PRESETS} />
        <ColorField
          label="Paper"
          value={style.background.color}
          onChange={onPaperChange}
          presets={PAPER_PRESETS}
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
            <span>Drop a PNG, JPEG, or WebP — or click to browse</span>
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

      <section className="flex flex-col gap-3 pb-2">
        <Eyebrow>Export</Eyebrow>
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
  );
}
