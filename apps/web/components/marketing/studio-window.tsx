import { renderQr, scannabilityReport } from "@qrcdn/qr-engine";
import { brandQrBackdrop, brandQrStyles } from "@/lib/explore";
import { ModuleMark } from "@/components/brand/magic";
import { glowSwatchSelected } from "@/components/brand/glow-tile";
import { ScannabilityChip } from "@/components/studio/scannability-chip";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { cn } from "@/lib/utils";
import { ProductWindow } from "./product-window";

// Static product shot — refreshed to current product truth (P9-U2), not the
// P2-era mockup: real shape swatches (components/qr/shape-swatches.tsx) in
// place of blank placeholder squares, a horizontal kit-pill row matching the
// real KitBar's layout (components/studio/kit-bar.tsx) instead of the old
// left-sidebar list, and — the important part — the REAL scannability
// instrument (components/studio/scannability-chip.tsx), fed a genuine
// ScannabilityReport + RenderResult.version computed once at module scope
// from the actual engine, not a hand-typed "Scannability 98" badge.
const QR_DATA = "HTTPS://QRCDN.COM/K7M2X9A";
const STYLE = brandQrStyles.precision;
const BACKDROP = brandQrBackdrop.precision;

const lightRender = renderQr({ data: QR_DATA, style: STYLE.light });
const darkRender = renderQr({ data: QR_DATA, style: STYLE.dark });
const lightReport = scannabilityReport(STYLE.light, { transparentBackdrop: BACKDROP.light });
const darkReport = scannabilityReport(STYLE.dark, { transparentBackdrop: BACKDROP.dark });

const KITS = [
  { name: "Café Norte", active: true },
  { name: "Second Story", active: false },
  { name: "Personal", active: false },
] as const;

const INK_SWATCHES = ["#131316", "#312e81", "#1e3a8a", "#0f766e"] as const;

export function StudioWindow() {
  return (
    <ProductWindow url="qrcdn.com/studio">
      {/* Kit row — mirrors the real TopBar/KitBar's horizontal pill layout,
          not the old mockup's vertical sidebar list. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
        {KITS.map((kit) => (
          <span
            key={kit.name}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px]",
              kit.active
                ? "border-primary/50 bg-accent text-accent-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            <ModuleMark className="size-2.5" />
            {kit.name}
          </span>
        ))}
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Style controls (static) */}
        <div className="flex-1 p-6">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Shape
          </p>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Module</span>
              <div className="flex gap-2">
                {DOT_STYLES.map((s, i) => (
                  <span
                    key={s}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md border border-border text-foreground",
                      i === 0 && glowSwatchSelected,
                    )}
                  >
                    <DotSwatch style={s} />
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Eye</span>
              <div className="flex gap-2">
                {EYE_FRAMES.map((f, i) => (
                  <span
                    key={f}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md border border-border text-foreground",
                      i === 0 && glowSwatchSelected,
                    )}
                  >
                    <EyeSwatch frame={f} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Colors
          </p>
          <div className="flex gap-2">
            {INK_SWATCHES.map((hex, i) => (
              <span
                key={hex}
                style={{ backgroundColor: hex }}
                className={cn(
                  "size-6 rounded-full border border-border/60",
                  i === 0 && glowSwatchSelected,
                )}
              />
            ))}
          </div>
        </div>

        {/* Preview — real light/dark render + the real instrument panel */}
        <div className="w-full border-t border-border/60 bg-surface-studio p-5 md:w-64 md:border-t-0 md:border-l lg:w-72">
          <p className="text-xs text-muted-foreground">Preview</p>
          <div className="mt-3 rounded-xl bg-qr-bg p-4">
            <div
              className="[&_svg]:h-auto [&_svg]:w-full dark:hidden"
              dangerouslySetInnerHTML={{ __html: lightRender.svg }}
            />
            <div
              className="hidden [&_svg]:h-auto [&_svg]:w-full dark:block"
              dangerouslySetInnerHTML={{ __html: darkRender.svg }}
            />
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            qrcdn.com/K7M2X9A
          </p>
          <div className="mt-3 dark:hidden">
            <ScannabilityChip report={lightReport} version={lightRender.version} />
          </div>
          <div className="mt-3 hidden dark:block">
            <ScannabilityChip report={darkReport} version={darkRender.version} />
          </div>
        </div>
      </div>
    </ProductWindow>
  );
}
