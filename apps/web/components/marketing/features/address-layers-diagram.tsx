import { ArrowRight } from "lucide-react";
import { QrTile } from "@/components/marketing/qr-tile";

/**
 * S1's "one address, two layers" diagram (/features/dynamic-codes,
 * P9.5-T-F1) — an authored, static, zero-JS visual (no "use client", no
 * hooks, no motion): a small print layer (the real, shared `QrTile`,
 * "sacred-still" per its own established convention — this diagram never
 * wraps it in motion either) and a live layer (a destination "row," styled
 * with a dashed border specifically to read as the mutable half — the
 * QrTile's own solid gradient border already reads as fixed/permanent by
 * contrast, so the visual language itself carries "one of these things
 * changes and one doesn't" without needing a caption to say so). Connected
 * by a plain `lucide-react` arrow (already a project dependency, used
 * elsewhere in server components — e.g. `hero.tsx`'s `ArrowRight` — so this
 * adds no new client JS: icons from this package are inert SVG output, not
 * an interactive island), rotated to point down when the layers stack on
 * narrow viewports and right once they sit side by side at `md`.
 */

const PRINTED_ADDRESS = "qrcdn.com/K7M2X9A";

function LayerLabel({ children }: { children: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </span>
  );
}

export function AddressLayersDiagram() {
  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-8">
      <div className="flex flex-col items-center gap-3">
        <LayerLabel>Print layer</LayerLabel>
        <QrTile className="w-28" />
        <p className="font-mono text-xs text-muted-foreground">{PRINTED_ADDRESS}</p>
      </div>

      <ArrowRight
        aria-hidden
        className="size-5 shrink-0 rotate-90 text-muted-foreground/60 md:rotate-0"
      />

      <div className="flex w-full max-w-[15rem] flex-col items-center gap-3">
        <LayerLabel>Live layer</LayerLabel>
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            destination
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            wherever you point it
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground">a database row you can change</p>
      </div>
    </div>
  );
}
