"use client";

import { useId } from "react";
import Link from "next/link";
import { DOT_STYLES, EYE_FRAMES, DotSwatch, EyeSwatch } from "@/components/qr/shape-swatches";
import { INKS, type KitConfig } from "./studio-kit";
import { cn } from "@/lib/utils";

/**
 * The studio object's floating config panel (P9.10-D11) — the three
 * fieldsets lifted from the retired studio-dials.tsx (P9.9-C2), now
 * presentational: state lives in the island (studio-object.tsx). Native
 * radios keep keyboard and AT semantics for free; the chips are the
 * studio's own dial vocabulary (shape-swatches.tsx) at the same size.
 */

/* P9.10-D3: the flat border became the lit-stroke hairline (D0 note 3 —
   the gradient stroke "applies to toggles, buttons, chips, cards"; these
   dials are the studio's toggles). The checked cue is an INSET ring so it
   can't collide with the focus-visible ring utilities, which share the
   outer ring slot. */
const CHIP =
  "lit-stroke flex size-10 cursor-pointer items-center justify-center rounded-lg bg-card/50 text-foreground/75 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:bg-card hover:text-foreground peer-checked:bg-muted peer-checked:text-foreground peer-checked:inset-ring peer-checked:inset-ring-foreground/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background";

function DialLegend({ children }: { children: string }) {
  return (
    <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </legend>
  );
}

export function StudioConfigPanel({
  value,
  onChange,
  className,
}: {
  value: KitConfig;
  onChange: (partial: Partial<KitConfig>) => void;
  className?: string;
}) {
  const uid = useId();
  return (
    <div
      data-slot="studio-config"
      className={cn(
        // The instrument card: lit-stroke is licensed here (a control
        // surface, not paper), the blur lets the object's light show
        // through where the panel overlaps the stage at lg.
        "lit-stroke flex flex-col gap-5 rounded-2xl bg-card/70 p-5 shadow-xl shadow-black/40 backdrop-blur-md",
        className,
      )}
    >
      <fieldset>
        <DialLegend>Module</DialLegend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DOT_STYLES.map((s) => (
            <label key={s}>
              <input
                type="radio"
                name={`${uid}-module`}
                value={s}
                checked={value.dot === s}
                onChange={() => onChange({ dot: s })}
                className="peer sr-only"
              />
              <span aria-hidden className={CHIP}>
                <DotSwatch style={s} />
              </span>
              <span className="sr-only">{s} modules</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <DialLegend>Eye</DialLegend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {EYE_FRAMES.map((f) => (
            <label key={f}>
              <input
                type="radio"
                name={`${uid}-eye`}
                value={f}
                checked={value.eye === f}
                onChange={() => onChange({ eye: f })}
                className="peer sr-only"
              />
              <span aria-hidden className={CHIP}>
                <EyeSwatch frame={f} />
              </span>
              <span className="sr-only">{f} eyes</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <DialLegend>Ink</DialLegend>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {INKS.map((hex) => (
            <label key={hex}>
              <input
                type="radio"
                name={`${uid}-ink`}
                value={hex}
                checked={value.ink === hex}
                onChange={() => onChange({ ink: hex })}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="block size-8 cursor-pointer rounded-full border border-white/20 transition-shadow duration-(--duration-normal) ease-(--motion-ease-out) peer-checked:ring-2 peer-checked:ring-foreground/70 peer-checked:ring-offset-2 peer-checked:ring-offset-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                style={{ backgroundColor: hex }}
              />
              <span className="sr-only">{hex} ink</span>
            </label>
          ))}
          <Link
            href="/studio"
            aria-label="More inks in the studio"
            className="flex size-8 items-center justify-center rounded-full border border-dashed border-border text-sm text-muted-foreground transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:border-foreground/50 hover:text-foreground"
          >
            +
          </Link>
        </div>
      </fieldset>
    </div>
  );
}
