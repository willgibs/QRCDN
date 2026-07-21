import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "@/lib/explore";
import { cn } from "@/lib/utils";
import { ProductWindow } from "./product-window";

// Static product shot — same data + style the live studio preview uses
// (studio-slice.tsx), but rendered once at module scope since nothing here
// is interactive. Both theme variants are rendered so the shot stays
// theme-correct without a client-side mount check.
const QR_DATA = "HTTPS://QRCDN.COM/K7M2X9A";
const lightSvg = renderQr({ data: QR_DATA, style: brandQrStyles.precision.light }).svg;
const darkSvg = renderQr({ data: QR_DATA, style: brandQrStyles.precision.dark }).svg;

const BRAND_KITS = [
  { name: "Café Norte", active: true },
  { name: "Second Story", active: false },
  { name: "Personal", active: false },
] as const;

/** Tiny 2×2 module grid standing in for a brand's QR ink/paper pair —
 *  echoes ModuleMark's full/half-opacity quadrant motif, recolored to the
 *  actual --qr-fg/--qr-bg bridge tokens instead of currentColor. */
function MiniCodeSwatch() {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 rounded-md bg-qr-fg p-1"
    >
      <span className="rounded-[1px] bg-qr-bg" />
      <span className="rounded-[1px] bg-qr-bg/50" />
      <span className="rounded-[1px] bg-qr-bg/50" />
      <span className="rounded-[1px] bg-qr-bg" />
    </span>
  );
}

/** The studio, as a static product shot — a three-pane layout with real
 *  rendered QR output on the right, everything else static decoration. */
export function StudioWindow() {
  return (
    <ProductWindow url="qrcdn.com/studio">
      <div className="flex flex-col overflow-hidden md:flex-row">
        {/* Left: brand kits */}
        <aside className="hidden w-52 shrink-0 border-r border-border/60 p-4 lg:block">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Brand kits
          </p>
          <div className="flex flex-col gap-1">
            {BRAND_KITS.map((kit) => (
              <div
                key={kit.name}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2",
                  kit.active && "bg-accent text-accent-foreground",
                )}
              >
                <MiniCodeSwatch />
                <span className="text-sm">{kit.name}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: style controls (static) */}
        <div className="flex-1 p-6">
          <h3 className="font-display font-semibold">Style</h3>

          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Module shape</span>
              <div className="flex gap-2">
                <span className="size-8 rounded-md border border-border ring-2 ring-ring" />
                <span className="size-8 rounded-md border border-border" />
                <span className="size-8 rounded-md border border-border" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Eye frame</span>
              <div className="flex gap-2">
                <span className="size-8 rounded-md border border-border" />
                <span className="size-8 rounded-md border border-border" />
                <span className="size-8 rounded-md border border-border" />
                <span className="size-8 rounded-md border border-border" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Module size</span>
                <span className="font-mono text-xs text-muted-foreground">92%</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-muted">
                <div className="h-1.5 w-[92%] rounded-full bg-primary" />
                <span className="absolute top-1/2 left-[92%] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Ink</span>
              <div className="flex gap-2">
                <span className="size-6 rounded-full border border-border/60 bg-[#131316]" />
                <span className="size-6 rounded-full border border-border/60 bg-[#312e81]" />
                <span className="size-6 rounded-full border border-border/60 bg-[#1e3a8a]" />
                <span className="size-6 rounded-full border border-border/60 bg-[#0f766e]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: preview */}
        <div className="w-full border-t border-border/60 bg-surface-studio p-5 md:w-64 md:border-t-0 md:border-l lg:w-72">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Preview</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              Scannability 98
            </span>
          </div>
          <div className="mt-4 rounded-xl bg-qr-bg p-4">
            <div
              className="[&_svg]:h-auto [&_svg]:w-full dark:hidden"
              dangerouslySetInnerHTML={{ __html: lightSvg }}
            />
            <div
              className="hidden [&_svg]:h-auto [&_svg]:w-full dark:block"
              dangerouslySetInnerHTML={{ __html: darkSvg }}
            />
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
            qrcdn.com/K7M2X9A
          </p>
        </div>
      </div>
    </ProductWindow>
  );
}
