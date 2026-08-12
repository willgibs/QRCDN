"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { CONTRAST_ERROR_MIN, CONTRAST_WARN_MIN, scannabilityReport } from "@qrcdn/qr-engine";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArtifactStage } from "@/components/brand/artifact-stage";
import { EASE_OUT } from "@/components/brand/magic";
import { glowTileOn } from "@/components/brand/glow-tile";
import { ColorField } from "@/components/studio/color-controls";
import { ScannabilityChip } from "@/components/studio/scannability-chip";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";
import { brandQrStyles } from "@/lib/brand-qr";
import { PREVIEW_PAYLOAD_DEFAULT, renderPreview } from "@/lib/preview";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { cn } from "@/lib/utils";

/**
 * The anonymous full playground (P9-U2) — born as the landing's "Design
 * one right now," upgraded from components/explore/studio-slice.tsx's
 * fixed-payload, hand-rolled color swatches into the real Studio
 * primitives: `ColorField` (react-colorful picker,
 * components/studio/color-controls.tsx), `ArtifactStage` (the marketing
 * staging rig — never `TiltStage`, which docs/guides/design-system.md
 * reserves for the authenticated studio), `ScannabilityChip` fed a real
 * `ScannabilityReport` + `RenderResult.version` via `renderPreview`
 * (lib/preview.ts, the error-safe wrapper — a visitor's payload can
 * overflow QR capacity, unlike studio-slice's fixed demo string), and
 * real SVG/PNG downloads (lib/export.ts). No account, no server
 * round-trip: everything here runs client-side against the same
 * `@qrcdn/qr-engine` the API and Studio use.
 *
 * P9.9-C2: the landing branch is gone. The landing's 03 slot renders
 * `StudioSection` (since P9.10-D11 the true-3D `StudioObject`; before
 * that the C2 dial wall — both far lighter islands), and this component's
 * sole consumer is /features/brand-studio, which supplies its own section
 * wrapper and heading ("Try it, no account"). The former `embedded` prop,
 * its `Section`/`SectionHeading` wrapper, and the closing
 * /features/brand-studio doorway (a page cannot doorway-link to itself,
 * and the landing copy now lives on section 04 alone) were deleted with
 * that branch — the body below is exactly what `embedded=true` rendered.
 */

/**
 * The instrument must never open criticizing our own default — light inks
 * are user choices it can honestly police. Print-truth staging: dark ink
 * on an explicit, opaque white paper mat, independent of the SITE's color
 * scheme — unlike the hero ScanNetwork tile's decorative dark-mode
 * inversion (brandQrStyles.precision.dark), which is fine precisely
 * because that tile carries no instrument and no download. Ink mirrors
 * the D13-locked precision style; paper is explicit/non-transparent so it
 * never resolves through the theme-reactive --qr-bg bridge the way a
 * transparent background would (a transparent mat here would still have
 * gone dark in dark mode and paired disastrously with this same dark ink).
 */
const DEFAULT_STYLE: QrStyle = {
  ...brandQrStyles.precision.light,
  background: {
    transparent: false,
    color: brandQrStyles.precision.light.background.color,
  },
};

// All dark-on-white by design (print-true default), plus the brand's own
// dark-mode ink as one preset — so a visitor can reach the honest inverted
// warning in a single click, not only via the free-hex field.
const INK_PRESETS = [
  "#131316",
  "#312e81",
  "#1e3a8a",
  "#0f766e",
  "#b91c1c",
  inkHexFromStyle(brandQrStyles.precision.dark),
] as const;

const PNG_EXPORT_SIZE = 1024;

/**
 * Preset shelf (P9.5-T3b) — three named style presets, one click sets
 * dots/eyes/ink/size together. The lead identity is "Ember" (P9.9-C1
 * board rename; the cast began life as `studio-window.tsx`'s "Café
 * Norte" / "Second Story" / "Personal"), kept deliberately identical to
 * the brand-system section's demo kit (`kit-sync-theatre.tsx`: rounded
 * dots 0.88, leaf eyes, `#131316` espresso ink) so the playground and
 * section 04 read as one recurring example brand. "Personal" is the
 * untouched schema/DEFAULT_STYLE look (`ink: null` clears any active
 * override rather than re-asserting the same hex, exercising the same
 * fallback path a manual reset would).
 */
interface PlaygroundPreset {
  name: string;
  dotStyle: (typeof DOT_STYLES)[number];
  eyeFrame: (typeof EYE_FRAMES)[number];
  sizeRatio: number;
  ink: string | null;
}

const PRESETS: readonly PlaygroundPreset[] = [
  { name: "Ember", dotStyle: "rounded", eyeFrame: "leaf", sizeRatio: 0.88, ink: "#131316" },
  { name: "Second Story", dotStyle: "circle", eyeFrame: "circle", sizeRatio: 0.78, ink: "#1e3a8a" },
  { name: "Personal", dotStyle: "square", eyeFrame: "square", sizeRatio: 1, ink: null },
];

// "~250ms" per spec, landing on the nearest standing motion token rather
// than an ad-hoc value (globals.css hard rule) — closer in feel to the
// scan-network hero chips' own 300ms active/inactive cross-fade than the
// 200ms hover/press-feedback tier, so control-to-control transitions read
// consistently with the rest of the page.
const PRESET_TRANSITION_S = 0.3;

/**
 * Cubic-bezier evaluator (Newton-Raphson, same technique the CSS spec's own
 * reference implementation uses) so the preset tween below can drive its
 * interpolation off a plain `setInterval` instead of motion/react's
 * rAF-driven `animate()`, while still following the project's real
 * `EASE_OUT` curve exactly rather than approximating it with a different
 * named easing. `setInterval` (unlike `requestAnimationFrame`) keeps firing
 * even if the tab loses visibility mid-transition — a real, if narrow, case
 * (a visitor alt-tabbing the instant after a preset click) that rAF would
 * otherwise just pause on, leaving the module-size control visibly stuck
 * until they return. Same "hand-roll the exact curve locally" precedent as
 * `orbit-stage.tsx`'s own `easeInOutCubic`, generalized to arbitrary
 * control points here since EASE_OUT isn't a fixed named shape.
 */
function cubicBezierEase(p1x: number, p1y: number, p2x: number, p2y: number) {
  const bx = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t;
  };
  const by = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t;
  };
  const bxDerivative = (t: number) => {
    const u = 1 - t;
    return 3 * u * u * p1x + 6 * u * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
  };
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = bx(t) - x;
      const d = bxDerivative(t);
      if (Math.abs(d) < 1e-6) break;
      t = Math.min(1, Math.max(0, t - dx / d));
    }
    return by(t);
  };
}

const easeOutCurve = cubicBezierEase(...EASE_OUT);

/** Ticks `onUpdate` at ~60fps via `setInterval` from `from` to `to` over
 *  `durationMs`, eased by `easeOutCurve`. Returns a stop function; the
 *  caller is responsible for calling it before starting a new tween or
 *  handing control to a manual drag (see `handlePreset`/
 *  `handleSizeRatioChange` below). */
function tweenValue(from: number, to: number, durationMs: number, onUpdate: (value: number) => void): () => void {
  const start = performance.now();
  const id = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / durationMs);
    onUpdate(from + (to - from) * easeOutCurve(t));
    if (t >= 1) clearInterval(id);
  }, 1000 / 60);
  return () => clearInterval(id);
}

/**
 * Live scannability meter (P9.5-T3b) — plots `report.worstContrast` on a
 * fixed 1:1-10:1 domain against the engine's OWN exported thresholds
 * (`CONTRAST_ERROR_MIN`/`CONTRAST_WARN_MIN`, `@qrcdn/qr-engine`), never
 * re-typed. Domain ceiling of 10:1 (not the theoretical 21:1 max) is a
 * display choice only, made so the 3:1/4:1 tick marks land somewhere
 * legible rather than crowded against the left edge — the underlying
 * number rendered as text is always the real, unclamped ratio.
 */
const METER_DOMAIN_MIN = 1;
const METER_DOMAIN_MAX = 10;

function meterPercent(ratio: number): number {
  const clamped = Math.min(METER_DOMAIN_MAX, Math.max(METER_DOMAIN_MIN, ratio));
  return ((clamped - METER_DOMAIN_MIN) / (METER_DOMAIN_MAX - METER_DOMAIN_MIN)) * 100;
}

function ContrastMeter({ worstContrast }: { worstContrast: number }) {
  const zone =
    worstContrast < CONTRAST_ERROR_MIN ? "error" : worstContrast < CONTRAST_WARN_MIN ? "warn" : "clean";
  const failPct = meterPercent(CONTRAST_ERROR_MIN);
  const warnPct = meterPercent(CONTRAST_WARN_MIN);

  return (
    <div className="flex w-full max-w-[16rem] flex-col gap-1.5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        <span>Contrast margin</span>
        <span
          className={cn(
            "tabular-nums",
            zone === "error" && "text-destructive",
            zone === "warn" && "text-amber-700 dark:text-amber-400",
          )}
        >
          {worstContrast.toFixed(2)}:1
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-[width] duration-(--duration-normal) ease-(--motion-ease-out)",
            zone === "error" && "bg-destructive",
            zone === "warn" && "bg-amber-500",
            zone === "clean" && "bg-emerald-500",
          )}
          style={{ width: `${meterPercent(worstContrast)}%` }}
        />
        {/* Real warn/fail threshold ticks — positions derived from the same
            imported constants the fill color above reads, never hand-placed. */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${failPct}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${warnPct}%` }}
        />
      </div>
      <div className="relative h-3 w-full font-mono text-[9px] text-muted-foreground/70">
        <span className="absolute -translate-x-1/2" style={{ left: `${failPct}%` }}>
          {CONTRAST_ERROR_MIN}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${warnPct}%` }}>
          {CONTRAST_WARN_MIN}
        </span>
      </div>
    </div>
  );
}

export function Playground() {
  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_DEFAULT);
  const [dotStyle, setDotStyle] = useState<(typeof DOT_STYLES)[number]>(DEFAULT_STYLE.dots.style);
  const [eyeFrame, setEyeFrame] = useState<(typeof EYE_FRAMES)[number]>(DEFAULT_STYLE.eyes.frame);
  const [sizeRatio, setSizeRatio] = useState(DEFAULT_STYLE.dots.sizeRatio);
  const [activeInk, setActiveInk] = useState<string | null>(null);
  const reduced = useReducedMotion();

  // Preset shelf (P9.5-T3b): dotStyle/eyeFrame/ink are discrete, so a preset
  // click sets them immediately (their own selected-state chrome carries a
  // plain CSS transition below); sizeRatio is the one continuous control, so
  // it's tweened over PRESET_TRANSITION_S via `tweenValue` (setInterval,
  // not rAF — see that function's own doc comment for why) rather than
  // snapping — the live re-renders that fall out of tweening the real
  // `sizeRatio` state are what make the module preview visibly resize
  // through the transition, not a separate effect layered on top. The ref
  // holds a stop function (tweenValue's own return value), not an
  // animation-library controls object.
  const presetTween = useRef<(() => void) | null>(null);

  function handlePreset(preset: PlaygroundPreset) {
    presetTween.current?.();
    presetTween.current = null;
    setDotStyle(preset.dotStyle);
    setEyeFrame(preset.eyeFrame);
    setActiveInk(preset.ink);
    if (reduced) {
      setSizeRatio(preset.sizeRatio);
      return;
    }
    presetTween.current = tweenValue(
      sizeRatio,
      preset.sizeRatio,
      PRESET_TRANSITION_S * 1000,
      setSizeRatio,
    );
  }

  // A manual slider drag mid-tween should win outright, not fight the
  // preset's own in-flight animation for the next several frames.
  function handleSizeRatioChange(next: number) {
    presetTween.current?.();
    presetTween.current = null;
    setSizeRatio(next);
  }

  // Stop any in-flight tween on unmount so its setInterval doesn't keep
  // ticking (and calling setSizeRatio) after the component is gone.
  useEffect(() => () => presetTween.current?.(), []);

  const activePresetName = useMemo(
    () =>
      PRESETS.find(
        (preset) =>
          preset.dotStyle === dotStyle &&
          preset.eyeFrame === eyeFrame &&
          preset.ink === activeInk &&
          Math.abs(preset.sizeRatio - sizeRatio) < 0.001,
      )?.name ?? null,
    [dotStyle, eyeFrame, activeInk, sizeRatio],
  );

  const style = useMemo(
    () =>
      parseQrStyle({
        ...DEFAULT_STYLE,
        dots: { style: dotStyle, sizeRatio },
        eyes: { ...DEFAULT_STYLE.eyes, frame: eyeFrame },
        ...(activeInk ? { fill: { type: "solid" as const, color: activeInk } } : {}),
      }),
    [dotStyle, eyeFrame, sizeRatio, activeInk],
  );

  const previewData = payload.trim().length > 0 ? payload : PREVIEW_PAYLOAD_DEFAULT;

  const { svg, error: renderError, version } = useMemo(
    () => renderPreview(previewData, style),
    [previewData, style],
  );

  // No transparentBackdrop option needed — style.background.transparent is
  // always false here (the explicit white mat above), so the report always
  // grades contrast against the artifact's own real paper, not a guess.
  const report = useMemo(() => scannabilityReport(style), [style]);

  const inkHex = inkHexFromStyle(style);

  const [exporting, setExporting] = useState<"png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  // Single Download button + format popover (P9.5-T3b): a brief success
  // check state on the trigger after either format completes, then reverts.
  const [justExported, setJustExported] = useState<"svg" | "png" | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    if (!justExported) return;
    const id = setTimeout(() => setJustExported(null), 1600);
    return () => clearTimeout(id);
  }, [justExported]);

  const handleExportSvg = useCallback(() => {
    setExportError(null);
    setDownloadOpen(false);
    try {
      // Re-rendered at PNG_EXPORT_SIZE rather than downloading the preview
      // string (P9.8-R2, same fix as studio-shell.tsx): the preview svg has
      // no width/height attributes, so design tools imported the file at
      // viewBox units (33x33 in Figma) instead of a usable size.
      const { svg: exportSvg, error } = renderPreview(
        previewData,
        style,
        undefined,
        PNG_EXPORT_SIZE,
      );
      if (error) {
        setExportError("Couldn't export: try again.");
        return;
      }
      downloadBlob(
        new Blob([exportSvg], { type: "image/svg+xml" }),
        exportFilename(previewData, "svg"),
      );
      setJustExported("svg");
    } catch {
      setExportError("Couldn't export: try again.");
    }
  }, [previewData, style]);

  const handleExportPng = useCallback(async () => {
    setExportError(null);
    setDownloadOpen(false);
    setExporting("png");
    try {
      const blob = await rasterizeSvgToPng(svg, PNG_EXPORT_SIZE);
      downloadBlob(blob, exportFilename(previewData, "png"));
      setJustExported("png");
    } catch {
      setExportError("Couldn't export: try again.");
    } finally {
      setExporting(null);
    }
  }, [svg, previewData]);

  const payloadId = useId();
  const canExport = !renderError;

  return (
    <>
      <SectionBody className="mb-6 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Try a kit
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={activePresetName ?? ""}
          onValueChange={(name) => {
            const preset = PRESETS.find((p) => p.name === name);
            if (preset) handlePreset(preset);
          }}
        >
          {PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset.name}
              value={preset.name}
              className={cn(
                glowTileOn,
                "px-3.5 font-mono text-[11px] transition-colors duration-(--duration-normal) ease-(--motion-ease-out)",
              )}
            >
              {preset.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SectionBody>

      <SectionBody delay={0.05} className="grid gap-6 lg:grid-cols-[1fr_360px]">
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
                    <ToggleGroupItem
                      key={s}
                      value={s}
                      aria-label={`${s} modules`}
                      className={cn(glowTileOn, "transition-colors duration-(--duration-normal) ease-(--motion-ease-out)")}
                    >
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
                    <ToggleGroupItem
                      key={f}
                      value={f}
                      aria-label={`${f} eyes`}
                      className={cn(glowTileOn, "transition-colors duration-(--duration-normal) ease-(--motion-ease-out)")}
                    >
                      <EyeSwatch frame={f} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Module size</Label>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(sizeRatio * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.4}
                  max={1}
                  step={0.01}
                  value={[sizeRatio]}
                  onValueChange={([v]) => v !== undefined && handleSizeRatioChange(v)}
                />
              </div>

              <ColorField
                label="Ink"
                value={inkHex}
                onChange={(hex) => setActiveInk(hex)}
                presets={INK_PRESETS}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <ArtifactStage glowColor={inkHex} wide className="mx-auto w-full max-w-[260px]">
              <div
                className="relative w-full overflow-hidden rounded-2xl p-5 shadow-xl shadow-black/25 ring-1 ring-black/10 dark:shadow-black/50 dark:ring-white/10"
                style={{ backgroundColor: style.background.color }}
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
                <>
                  <ScannabilityChip report={report} version={version} />
                  <ContrastMeter worstContrast={report.worstContrast} />
                </>
              )}

              <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={!canExport}>
                    {justExported ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden />
                    )}
                    {justExported ? "Downloaded" : "Download"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-36 p-1.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={handleExportSvg}
                      className="rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted"
                    >
                      SVG
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={exporting === "png"}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    >
                      {exporting === "png" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                      PNG
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              {exportError && <p className="text-xs text-destructive">{exportError}</p>}

              <p className="text-center text-xs text-muted-foreground">
                Static codes are free forever. Want this one dynamic?{" "}
                <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                  Start free.
                </Link>
              </p>
            </div>
          </div>
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-4">
        <MonoStrip>SVG + PNG export · instrument: live · engine: open source</MonoStrip>
      </SectionBody>
    </>
  );
}
