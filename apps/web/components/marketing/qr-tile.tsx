import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "@/lib/brand-qr";
import { cn } from "@/lib/utils";

/**
 * The hero QR artifact — extracted to its own module at P9.5-T3a so both
 * ScanNetwork (the xl/compact network stages) and OrbitStage (the <md
 * orbit) render the exact same tile (same payload, same render, same
 * shadow/border) without a circular import between the two (OrbitStage
 * needs QrTile; ScanNetwork renders OrbitStage for its <md stage).
 *
 * Payload is the marketing site itself (scanning the hero lands you on the
 * page you're already looking at, uppercase for alphanumeric mode) — no
 * slug caption, since there's no destination slug to caption when the
 * payload IS the site.
 *
 * Board round 5: inner paddings tightened (card layer 14px→10px, qr-box
 * layer 10px→8px; outer tile footprint/border untouched) so the printed
 * code itself reads meaningfully larger within the same tile — at the
 * hero's own ~176px tile this is a ~9.5% larger code side (~20% larger
 * code area), landing at the top of the board's "15-20% larger area"
 * ask. The qr-box's own 8px is a presentational margin only, not a
 * scannability quiet zone — `renderQr`'s SVG output already bakes in the
 * real D6 quiet zone (4 modules) regardless of this box's CSS padding, so
 * tightening it further here carries no decode risk. Shared by every
 * consumer (`ScanNetwork`'s xl/compact stages, `OrbitStage`) automatically.
 */
const QR_DATA = "HTTPS://WWW.QRCDN.COM";
const lightQr = renderQr({ data: QR_DATA, style: brandQrStyles.precision.light }).svg;
const darkQr = renderQr({ data: QR_DATA, style: brandQrStyles.precision.dark }).svg;

export function QrTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15",
        className,
      )}
    >
      <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-2.5 backdrop-blur-xl">
        <div className="rounded-xl bg-qr-bg p-2">
          <div
            className="[&_svg]:h-auto [&_svg]:w-full dark:hidden"
            dangerouslySetInnerHTML={{ __html: lightQr }}
          />
          <div
            className="hidden [&_svg]:h-auto [&_svg]:w-full dark:block"
            dangerouslySetInnerHTML={{ __html: darkQr }}
          />
        </div>
      </div>
    </div>
  );
}
