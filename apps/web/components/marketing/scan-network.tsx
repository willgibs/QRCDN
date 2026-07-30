"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "@/lib/explore";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/components/brand/magic";

/**
 * The hero artwork: a scan network. One printed code at the center; animated
 * traces flow to whichever destination it currently points at — the
 * retargeting story told as decorative line art (Pipeline-style circuit
 * traces). Harvested-for-pattern from components/explore/network.tsx
 * (P9-U2) into a fresh marketing-owned file. Stage is a fixed 1000×300
 * coordinate system scaled per breakpoint so SVG paths and HTML chips never
 * drift apart.
 *
 * The QR tile itself is rendered ONCE at module scope (light + dark, toggled
 * via `dark:hidden`/`dark:block`) rather than through a client-side,
 * theme-reactive render — the same zero-client-JS static-render pattern the
 * framed product windows use. Only the chip-cycling interval and entrance
 * motion need to be client-side here.
 */

const QR_DATA = "HTTPS://QRCDN.COM/K7M2X9A";
const lightQr = renderQr({ data: QR_DATA, style: brandQrStyles.precision.light }).svg;
const darkQr = renderQr({ data: QR_DATA, style: brandQrStyles.precision.dark }).svg;

const DESTINATIONS = [
  { label: "yourcafe.com/menu", x: 150, y: 70, side: "left" as const },
  { label: "instagram.com/drop", x: 150, y: 230, side: "left" as const },
  { label: "tickets.io/tour-2026", x: 850, y: 70, side: "right" as const },
  { label: "g.page/cafe-norte/review", x: 850, y: 230, side: "right" as const },
];

const PATHS = [
  "M412 110 C340 110 340 70 268 70 L158 70",
  "M412 190 C340 190 340 230 268 230 L158 230",
  "M588 110 C660 110 660 70 732 70 L842 70",
  "M588 190 C660 190 660 230 732 230 L842 230",
];

const CYCLE_MS = 2800;

function QrTile({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15",
        className,
      )}
    >
      <div className="flex flex-col gap-2 rounded-[calc(1.5rem-1px)] bg-card/90 p-3.5 backdrop-blur-xl">
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
        <p className="text-center font-mono text-[10px] tracking-wide text-muted-foreground">
          qrcdn.com/K7M2X9A
        </p>
      </div>
    </div>
  );
}

function DestinationChip({
  label,
  active,
  className,
  style,
}: {
  label: string;
  active: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] whitespace-nowrap transition-colors duration-300",
        active
          ? "border-primary/50 bg-accent text-accent-foreground shadow-md shadow-primary/10"
          : "border-border bg-card/70 text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full transition-colors duration-300",
          active ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </div>
  );
}

export function ScanNetwork() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(
      () => setActive((i) => (i + 1) % DESTINATIONS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* Full network stage — md and up */}
      <div className="hidden md:block">
        {/* Stage is 1000×300 + ~30px chip overhang each side; scale steps keep
            the full artwork inside the content column at every breakpoint. */}
        <div className="relative mx-auto h-[200px] w-full max-w-[1000px] lg:h-[240px] xl:h-[300px]">
          <div className="absolute left-1/2 top-0 h-[300px] w-[1000px] origin-top -translate-x-1/2 scale-[0.66] lg:scale-[0.8] xl:scale-100">
            <svg
              viewBox="0 0 1000 300"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              {PATHS.map((d, i) => (
                <path
                  key={`base-${i}`}
                  d={d}
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className={cn(
                    "stroke-border transition-opacity duration-300",
                    i === active ? "opacity-100" : "opacity-60",
                  )}
                />
              ))}
              {/* the live trace: an energy packet flowing along the active path */}
              {!reduced && (
                <path
                  key={`flow-${active}`}
                  d={PATHS[active]}
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="animate-qr-flow stroke-primary"
                />
              )}
            </svg>

            {DESTINATIONS.map((dest, i) => (
              <motion.div
                key={dest.label}
                className="absolute"
                // Positioning never rides the animated transform: left chips
                // anchor via `right`, so motion only ever touches opacity.
                style={
                  dest.side === "left"
                    ? { right: 1000 - dest.x, top: dest.y - 15 }
                    : { left: dest.x, top: dest.y - 15 }
                }
                initial={{
                  opacity: 0,
                  transform: reduced ? "translateY(0px)" : "translateY(8px)",
                }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.07, ease: EASE_OUT }}
              >
                <DestinationChip label={dest.label} active={i === active} />
              </motion.div>
            ))}

            <div className="absolute left-1/2 top-1/2 w-[176px] -translate-x-1/2 -translate-y-1/2">
              <motion.div
                initial={{
                  opacity: 0,
                  transform: reduced ? "scale(1)" : "scale(0.96)",
                }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
              >
                <QrTile />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact stage — below md */}
      <div className="flex flex-col items-center gap-4 md:hidden">
        <motion.div
          className="w-[180px]"
          initial={{
            opacity: 0,
            transform: reduced ? "scale(1)" : "scale(0.96)",
          }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
        >
          <QrTile />
        </motion.div>
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-4">
          {DESTINATIONS.slice(0, 3).map((dest, i) => (
            <DestinationChip
              key={dest.label}
              label={dest.label}
              active={i === active % 3}
            />
          ))}
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-xs text-muted-foreground">
        <span className="text-primary">●</span> destination updated live — the
        printed code never changes
      </p>
    </div>
  );
}
