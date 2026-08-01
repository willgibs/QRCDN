import type { ReactNode } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { cn } from "@/lib/utils";

/**
 * The brand-system section's body (P9.5-T3b), replacing the old
 * `StudioWindow` kit-window mock (deleted this unit — it read as a second
 * builder, the board's exact note). This is a contact sheet instead: ONE
 * kit style, rendered across several real-world print artifacts, so the
 * section shows "set once, appears everywhere" rather than another editor.
 *
 * Zero client JS (no "use client", no hooks) — every render below runs once
 * at module scope from the real engine, the same static-composition idiom
 * `qr-tile.tsx`/`studio-window.tsx` already used. One shared `KIT_STYLE`
 * object feeds every mat; only the payload differs per artifact, proving
 * the "one kit, many codes" claim with real bytes rather than five
 * independently hand-tuned previews that could quietly drift apart.
 *
 * Ink stays the D13-locked precision hex (`#131316`, same value
 * `brandQrStyles.precision.light` uses) so the kit reads as on-brand; shape
 * (rounded dots, leaf eyes) is deliberately distinct from the QrTile/
 * playground default (square/square) so this section's kit has its own
 * visible identity. The playground's "Café Norte" preset
 * (`playground.tsx`) mirrors this exact dots/eyes/ink triple on purpose,
 * for a small continuity thread between the two sections.
 */
const KIT_STYLE: QrStyle = parseQrStyle({
  v: 1,
  dots: { style: "rounded", sizeRatio: 0.88 },
  eyes: { frame: "leaf", pupil: "circle", color: null },
  fill: { type: "solid", color: "#131316" },
  background: { transparent: false, color: "#ffffff" },
});

const KIT_INK = inkHexFromStyle(KIT_STYLE);

interface Artifact {
  label: string;
  path: string;
  rotate: string;
}

const ARTIFACTS: Record<"menu" | "sticker" | "ticket" | "table" | "poster", Artifact> = {
  menu: { label: "menu tent", path: "/MENU", rotate: "-rotate-2" },
  sticker: { label: "sticker", path: "/DROP", rotate: "rotate-2" },
  ticket: { label: "ticket stub", path: "/EVENT", rotate: "-rotate-1" },
  table: { label: "table talker", path: "/TABLE", rotate: "rotate-1" },
  poster: { label: "poster corner", path: "/REVIEW", rotate: "-rotate-3" },
};

function renderKit(path: string): string {
  return renderQr({ data: `HTTPS://QRCDN.COM${path}`, style: KIT_STYLE }).svg;
}

const SVG = {
  menu: renderKit(ARTIFACTS.menu.path),
  sticker: renderKit(ARTIFACTS.sticker.path),
  ticket: renderKit(ARTIFACTS.ticket.path),
  table: renderKit(ARTIFACTS.table.path),
  poster: renderKit(ARTIFACTS.poster.path),
};

/** Shared "scattered on a table" wrapper: a slight fixed rotation (never
 *  more than 3deg, per the spec) that relaxes flat on hover as a free,
 *  zero-JS `motion-safe:` micro-interaction (no client component needed for
 *  a pure CSS hover transform; `motion-safe:` is the reduced-motion gate,
 *  the same contract every JS-driven animation on this page follows). */
function Mat({
  artifact,
  shapeClassName,
  aspectClassName,
  children,
}: {
  artifact: Artifact;
  shapeClassName: string;
  aspectClassName: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        artifact.rotate,
        "motion-safe:transition-transform motion-safe:duration-(--duration-normal) motion-safe:ease-(--motion-ease-out) motion-safe:hover:rotate-0 motion-safe:hover:-translate-y-1",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-white shadow-md ring-1 ring-black/10 dark:ring-white/10",
          shapeClassName,
          aspectClassName,
        )}
      >
        {children}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {artifact.label}
      </p>
    </div>
  );
}

function QrGlyph({ svg, className }: { svg: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("[&_svg]:h-auto [&_svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function PayloadCaption({ path }: { path: string }) {
  return (
    <p className="mt-1.5 text-center font-mono text-[9px] text-black/40">{path.toLowerCase()}</p>
  );
}

export function KitContactSheet() {
  return (
    <div className="flex flex-col gap-8">
      {/* Kit legend — ink swatch + shape/eye glyphs, connecting the sheet
          below back to "this is one kit." */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className="size-3 rounded-full border border-border/60"
            style={{ backgroundColor: KIT_INK }}
          />
          ink
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <DotSwatch style="rounded" />
          rounded dots
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          <EyeSwatch frame="leaf" />
          leaf eyes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-8">
        {/* Menu tent card — portrait, folded-card proportions, QR + payload
            caption centered like a tabletop tent card. */}
        <Mat artifact={ARTIFACTS.menu} shapeClassName="rounded-lg p-4" aspectClassName="aspect-[3/4]">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <QrGlyph svg={SVG.menu} className="w-16" />
            <PayloadCaption path={ARTIFACTS.menu.path} />
          </div>
        </Mat>

        {/* Round sticker — die-cut circle, QR only (stickers carry no
            caption in the real world), a dashed inner ring suggesting the
            cut line. */}
        <Mat artifact={ARTIFACTS.sticker} shapeClassName="rounded-full p-5" aspectClassName="aspect-square">
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-black/15">
            <QrGlyph svg={SVG.sticker} className="w-14" />
          </div>
        </Mat>

        {/* Ticket stub — landscape, a perforated tear line with notches
            separating the QR half from a stub half. */}
        <Mat
          artifact={ARTIFACTS.ticket}
          shapeClassName="rounded-lg p-4"
          aspectClassName="aspect-[12/5] col-span-2 sm:col-span-1"
        >
          <div className="relative flex h-full items-center">
            <div className="flex h-full flex-1 items-center justify-center">
              <QrGlyph svg={SVG.ticket} className="w-14" />
            </div>
            <div className="relative flex h-full w-10 flex-col items-center justify-center border-l border-dashed border-black/20">
              <span aria-hidden className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-surface-studio" />
              <span aria-hidden className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-surface-studio" />
              <span className="rotate-90 font-mono text-[8px] tracking-[0.2em] whitespace-nowrap text-black/40">
                ADMIT ONE
              </span>
            </div>
          </div>
        </Mat>

        {/* Table talker — small free-standing tabletop card, near-square. */}
        <Mat artifact={ARTIFACTS.table} shapeClassName="rounded-lg p-4" aspectClassName="aspect-[4/5]">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <QrGlyph svg={SVG.table} className="w-16" />
            <PayloadCaption path={ARTIFACTS.table.path} />
          </div>
        </Mat>

        {/* Poster corner — a fragment of a much larger sheet: the QR sits
            anchored in one corner with generous white space implying the
            poster continues off-frame. */}
        <Mat
          artifact={ARTIFACTS.poster}
          shapeClassName="rounded-lg p-5 col-span-2"
          aspectClassName="aspect-[16/7]"
        >
          <div className="flex h-full items-end justify-start">
            <QrGlyph svg={SVG.poster} className="w-14" />
          </div>
        </Mat>
      </div>
    </div>
  );
}
