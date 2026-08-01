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
      <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-3.5 backdrop-blur-xl">
        <div className="rounded-xl bg-qr-bg p-2.5">
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
