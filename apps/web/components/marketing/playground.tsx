"use client";

import { useCallback, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { scannabilityReport } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArtifactStage } from "@/components/brand/artifact-stage";
import { glowTileOn } from "@/components/brand/glow-tile";
import { Eyebrow, Reveal } from "@/components/brand/magic";
import { ColorField } from "@/components/studio/color-controls";
import { ScannabilityChip } from "@/components/studio/scannability-chip";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { useMounted } from "@/hooks/use-mounted";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";
import { brandQrBackdrop, brandQrStyles } from "@/lib/explore";
import { PREVIEW_PAYLOAD_DEFAULT, renderPreview } from "@/lib/preview";
import { inkHexFromStyle } from "@/lib/qr-style-derive";

/**
 * The anonymous landing playground (P9-U2) — "Design one right now,"
 * upgraded from components/explore/studio-slice.tsx's fixed-payload,
 * hand-rolled color swatches into the real Studio primitives: `ColorField`
 * (react-colorful picker, components/studio/color-controls.tsx),
 * `ArtifactStage` (the marketing staging rig — never `TiltStage`, which
 * docs/guides/design-system.md reserves for the authenticated studio),
 * `ScannabilityChip` fed a real `ScannabilityReport` + `RenderResult.version`
 * via `renderPreview` (lib/preview.ts, the error-safe wrapper — a visitor's
 * payload can overflow QR capacity, unlike studio-slice's fixed demo
 * string), and real SVG/PNG downloads (lib/export.ts). No account, no
 * server round-trip: everything here runs client-side against the same
 * `@qrcdn/qr-engine` the API and Studio use.
 *
 * Ink is theme-scoped exactly like studio-slice.tsx: a custom color chosen
 * in one color mode is deliberately dropped on a theme flip (a swatch tuned
 * for light can kill contrast in dark) rather than carried over silently.
 */

const INK_PRESETS = ["#131316", "#312e81", "#1e3a8a", "#0f766e", "#b91c1c"] as const;
const PNG_EXPORT_SIZE = 1024;

export function Playground() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  const mode: "light" | "dark" = dark ? "dark" : "light";
  const base = brandQrStyles.precision[mode];

  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_DEFAULT);
  const [dotStyle, setDotStyle] = useState<(typeof DOT_STYLES)[number]>(
    brandQrStyles.precision.light.dots.style,
  );
  const [eyeFrame, setEyeFrame] = useState<(typeof EYE_FRAMES)[number]>(
    brandQrStyles.precision.light.eyes.frame,
  );
  const [sizeRatio, setSizeRatio] = useState(brandQrStyles.precision.light.dots.sizeRatio);
  const [inkSelection, setInkSelection] = useState<{
    mode: "light" | "dark";
    color: string | null;
  }>({ mode: "light", color: null });
  const activeInk = inkSelection.mode === mode ? inkSelection.color : null;

  const style = useMemo(
    () =>
      parseQrStyle({
        ...base,
        dots: { style: dotStyle, sizeRatio },
        eyes: { ...base.eyes, frame: eyeFrame },
        ...(activeInk ? { fill: { type: "solid" as const, color: activeInk } } : {}),
      }),
    [base, dotStyle, eyeFrame, sizeRatio, activeInk],
  );

  const previewData = payload.trim().length > 0 ? payload : PREVIEW_PAYLOAD_DEFAULT;

  const { svg, error: renderError, version } = useMemo(
    () => renderPreview(previewData, style),
    [previewData, style],
  );

  const report = useMemo(
    () => scannabilityReport(style, { transparentBackdrop: brandQrBackdrop.precision[mode] }),
    [style, mode],
  );

  const inkHex = inkHexFromStyle(style);

  const [exporting, setExporting] = useState<"png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportSvg = useCallback(() => {
    setExportError(null);
    try {
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), exportFilename(previewData, "svg"));
    } catch {
      setExportError("Couldn't export — try again.");
    }
  }, [svg, previewData]);

  const handleExportPng = useCallback(async () => {
    setExportError(null);
    setExporting("png");
    try {
      const blob = await rasterizeSvgToPng(svg, PNG_EXPORT_SIZE);
      downloadBlob(blob, exportFilename(previewData, "png"));
    } catch {
      setExportError("Couldn't export — try again.");
    } finally {
      setExporting(null);
    }
  }, [svg, previewData]);

  const payloadId = useId();
  const canExport = !renderError;

  return (
    <section className="border-b border-border/60 bg-surface-studio">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>The studio</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Design one right now.
          </h2>
          <p className="mt-2 text-muted-foreground">
            No account, no watermark — the real engine and the same
            scannability instrument the studio uses. The file is yours.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Style controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor={payloadId}>Destination</Label>
                <Input
                  id={payloadId}
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder="https://yoursite.com"
                  spellCheck={false}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Module shape</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={dotStyle}
                  onValueChange={(v) => v && setDotStyle(v as typeof dotStyle)}
                >
                  {DOT_STYLES.map((s) => (
                    <ToggleGroupItem key={s} value={s} aria-label={`${s} modules`} className={glowTileOn}>
                      <DotSwatch style={s} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Eye frame</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={eyeFrame}
                  onValueChange={(v) => v && setEyeFrame(v as typeof eyeFrame)}
                >
                  {EYE_FRAMES.map((f) => (
                    <ToggleGroupItem key={f} value={f} aria-label={`${f} eyes`} className={glowTileOn}>
                      <EyeSwatch frame={f} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Module size</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(sizeRatio * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.4}
                  max={1}
                  step={0.01}
                  value={[sizeRatio]}
                  onValueChange={([v]) => v !== undefined && setSizeRatio(v)}
                />
              </div>

              <ColorField
                label="Ink"
                value={inkHex}
                onChange={(hex) => setInkSelection({ mode, color: hex })}
                presets={INK_PRESETS}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <ArtifactStage glowColor={inkHex} className="mx-auto w-full max-w-[260px]">
              <div
                className="relative w-full overflow-hidden rounded-2xl p-5 shadow-xl shadow-black/25 ring-1 ring-black/10 dark:shadow-black/50 dark:ring-white/10"
                style={{ backgroundColor: "var(--qr-bg)" }}
              >
                <div
                  role="img"
                  aria-label={`QR preview for ${previewData}`}
                  className="relative [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            </ArtifactStage>

            <div className="flex flex-col items-center gap-3">
              {renderError ? (
                <div
                  role="alert"
                  className="flex w-full max-w-[30rem] items-start gap-2 text-left text-xs leading-snug text-destructive"
                >
                  <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>{renderError}</span>
                </div>
              ) : (
                <ScannabilityChip report={report} version={version} />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportSvg}
                  disabled={!canExport}
                >
                  SVG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportPng}
                  disabled={!canExport || exporting === "png"}
                >
                  {exporting === "png" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  PNG
                </Button>
              </div>
              {exportError && <p className="text-xs text-destructive">{exportError}</p>}

              <p className="text-center text-xs text-muted-foreground">
                Static codes are free forever. Want this one dynamic?{" "}
                <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                  Start free.
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
