import type { ReactNode } from "react";
import { brandQrStyles } from "@/lib/brand-qr";
import { definePrintCode, PrintCodeDefs, PrintMat } from "@/components/marketing/print-mat";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { HUE_CLASSES } from "@/components/marketing/destination-hues";
import { cn } from "@/lib/utils";

/**
 * The "01 How it works" body (P9.7-U2), replacing the old three-identical-
 * ModuleMark-tiles grid. One continuous filmstrip on a shared baseline: a
 * hairline `rule` at the vertical position every station's primary object
 * rests on, so the sequence reads as one object surviving three moments
 * (Set / Print / Repoint) rather than three unrelated illustrations. Below
 * `md` there is no shared baseline to hold (the rule and ticks would just
 * reserve dead space on the two stations with nothing below the line), so
 * the absolute geometry is dropped entirely and the stations stack as
 * hairline-separated flow rows instead — translated from the reference
 * artifact's `@container` breakpoint to a plain viewport breakpoint. P9.7-V3
 * moved that breakpoint from `md` to `lg`: a fourth station arrived, and four
 * across at 768px forces the station art down to a size where the codes stop
 * reading. Below `lg` the stations stack as hairline-separated flow rows, the
 * same fallback that already ran below `md`.
 * (the artifact's own number was a demo-only 760px container query,
 * which existed only to simulate a mobile width inside the artifact's own
 * full-width review page; the real section has no such wrapper, so the
 * project's standard breakpoint is the more correct translation here, not
 * a re-authored 760px media query).
 *
 * Zero client JS: every value below is computed once at module scope from
 * the real engine, the same static-composition idiom `qr-tile.tsx` and
 * `kit-sync-theatre.tsx` use. No hooks, no "use client".
 *
 * ---- Why one `<symbol>` per code instead of an engine render per instance ----
 * The product claim this section makes is "the same code, unchanged, at
 * every station". The engine runs exactly ONCE per code and every on-page
 * instance references that single definition via `<use>`, which is also
 * literally the same DOM node — the claim is true of the markup, not just
 * asserted in a sentence beside it.
 *
 * That machinery moved to `print-mat.tsx` at P9.10-D5, once section 05
 * needed the same object and this file's copy would have been the third
 * hand-built one. The guarded extraction regex went with it, and so did its
 * failure mode: if the engine's output shape ever changes underneath, it
 * throws at module load rather than silently rendering broken markup.
 *
 * Measured when the approach was chosen, and the reason it stays: `next
 * build`'s served `/` HTML was 861,279 bytes with the shared-symbol
 * approach. Temporarily swapping it for ten repeated
 * `dangerouslySetInnerHTML` copies (one full engine SVG per instance) and
 * rebuilding produced 970,768 bytes — 109,489 bytes heavier, about 12.7% of
 * the whole page's raw HTML, for markup that is otherwise pixel-identical.
 * Gzipped the gap narrows (65,917 vs 69,267 bytes, 4.8%) since ten
 * byte-identical chunks compress well, but the symbol approach still wins
 * under compression, at a fraction of the raw-byte cost. (The RSC flight
 * payload Next embeds alongside the rendered HTML means each id/string
 * appears twice in the served bytes, which is why those deltas are roughly
 * double a naive per-instance estimate — a characteristic of every static
 * Next page, not of this section.)
 */

/* Three distinct codes, one shared kit. Code A is the thread: it is the code
   you style at station 1, one of the codes you mint at station 2, and the
   code you repoint at station 3. B and C exist only to make station 2's
   "create new codes" literal — three visibly different module patterns that
   obviously share one style is the only way to draw "the kit propagates"
   without saying it. */
const QR_A = "HTTPS://QRCDN.COM/CAFE";
const QR_B = "HTTPS://QRCDN.COM/MENU";
const QR_C = "HTTPS://QRCDN.COM/TOUR";

/** The D13-locked precision ink hex, derived rather than re-hardcoded (the
 *  `inkHexFromStyle` helper the studio surfaces share). Always the LIGHT
 *  variant: the kit swatch below shows ink-on-paper (what actually
 *  prints), which never swaps with the site's own theme. */
const KIT_INK = inkHexFromStyle(brandQrStyles.precision.light);

const CODES = {
  a: definePrintCode(QR_A, "hiw-a"),
  b: definePrintCode(QR_B, "hiw-b"),
  c: definePrintCode(QR_C, "hiw-c"),
} as const;

type CodeKey = keyof typeof CODES;

/**
 * A station's printed code. P9.10-D5 collapsed this onto the shared
 * `PrintMat` primitive: it had become the second hand-built copy of the same
 * object (the hero's mats are the first), and section 05 was about to be a
 * third. `PrintMat`'s defaults are chosen to reproduce what this rendered
 * before adoption exactly, so the swap carries no visual delta.
 *
 * `tone` is depth, never hue. It used to be a VIOLET bloom that the
 * monochrome amendment had quietly repainted white; D4 replaced it with a
 * deeper shadow on the two solo stations, which is also the hero's own
 * physics one section up, where three paper mats float on shadow alone.
 */
function QrNode({
  code = "a",
  size = 132,
  tone = "accent",
}: {
  code?: CodeKey;
  size?: number;
  tone?: "accent" | "plain";
}) {
  return <PrintMat code={CODES[code]} size={size} depth={tone === "accent" ? "raised" : "rest"} />;
}

function StationMeta({ label, title, note }: { label: string; title: string; note: string }) {
  return (
    <>
      <p className="mt-7 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2.5 text-[1.25rem] leading-tight font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
        {note}
      </p>
    </>
  );
}

/** The 1px tick that crosses the rule at each station's centre. Absolute
 *  positioning drops entirely below `lg` (see the file header) rather than
 *  just hiding visually, so it never reserves layout space on mobile. */
function StationTick() {
  return (
    <span
      aria-hidden
      className="hidden lg:absolute lg:top-[146px] lg:left-1/2 lg:block lg:h-[13px] lg:w-px lg:-translate-x-1/2 lg:bg-muted-foreground lg:opacity-45"
    />
  );
}

/** Shared station shell: the mobile hairline-row border collapses to
 *  nothing at `lg`, where the shared `rule` (rendered once by `Filmstrip`)
 *  takes over as the separator between stations instead. */
function Station({ children }: { children: ReactNode }) {
  return <div className="border-t border-border pt-[18px] lg:border-t-0 lg:pt-0">{children}</div>;
}

/** Station art area: 248px tall (`lg:h-[248px]`) with a relative-positioning
 *  context for the tick/stage/under children at `lg`, plain document flow
 *  below it. */
function StationArt({ children }: { children: ReactNode }) {
  return <div className="relative lg:h-[248px]">{children}</div>;
}

/** The row that sits ON the rule (`bottom: 96px` of the 248px art area puts
 *  its bottom edge exactly on the rule's own 152px line). Flow row on
 *  mobile, absolute at `lg`. */
function StationStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end justify-center gap-4 pt-2 pb-1 lg:absolute lg:inset-x-0 lg:bottom-[96px] lg:p-0">
      {children}
    </div>
  );
}

function SetStation() {
  return (
    <Station>
      <StationArt>
        <StationTick />
        <StationStage>
          <QrNode code="a" />
        </StationStage>
        <div className="mt-4 flex justify-center lg:absolute lg:inset-x-0 lg:top-[170px] lg:mt-0">
          <span className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 font-mono text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="relative size-[13px] shrink-0 rounded-[3px] border border-border bg-white"
              >
                <span
                  aria-hidden
                  className="absolute inset-[2.5px] rounded-[1px]"
                  style={{ backgroundColor: KIT_INK }}
                />
              </span>
              {KIT_INK}
            </span>
            <span>rounded</span>
            <span>circle eye</span>
          </span>
        </div>
      </StationArt>
      <StationMeta
        label="Design"
        title="Design your style"
        note="Pick your ink, module shape and corner style once. That kit becomes your look."
      />
    </Station>
  );
}

function PrintStation() {
  return (
    <Station>
      <StationArt>
        <StationTick />
        <StationStage>
          {/* Board review round 2: this station used to show one code on three
              print surfaces (a tent card, a sticker, a poster), which
              illustrated "print anywhere" rather than the step it now carries,
              "create new codes". Three genuinely different codes wearing one
              identical style says that directly: the module patterns differ,
              the ink, corner radius and eye shape do not. Code A is the same
              code styled at station 1 and repointed at station 3, so the
              thread through the filmstrip survives. */}
          <div className="flex items-end -space-x-6">
            <span className="relative z-0 rotate-[-4deg]">
              <QrNode code="c" size={84} tone="plain" />
            </span>
            <span className="relative z-10 rotate-[2deg]">
              <QrNode code="b" size={84} tone="plain" />
            </span>
            <span className="relative z-20">
              <QrNode code="a" size={92} tone="plain" />
            </span>
          </div>
        </StationStage>
      </StationArt>
      <StationMeta
        label="Create"
        title="Create new codes"
        note="Every code you make inherits the kit. Export SVG or PNG, no watermark, no limits on static codes."
      />
    </Station>
  );
}

/**
 * Track. The one station where the code is not the subject: it has been
 * printed and is out in the world, and what there is to look at is the scans
 * coming back. So the code stays (the thread through the filmstrip is that it
 * is always the same code) and the density field rises off the same baseline
 * everything else stands on, which is what makes a scan read as an event
 * rather than a number.
 */
const SCAN_BARS = [4, 5, 4, 6, 5, 7, 6, 9, 8, 12, 17, 24, 19, 13, 9, 7, 6, 5];

function TrackStation() {
  return (
    <Station>
      <StationArt>
        <StationTick />
        <StationStage>
          <div className="flex h-[92px] items-end gap-[3px]" aria-hidden>
            {SCAN_BARS.map((h, i) => (
              <span
                key={i}
                className={cn(
                  // P9.10-D4: was `bg-primary`, which since the monochrome
                  // amendment renders pure white — white budget spent on a
                  // decorative chart. These bars are DATA, and D3's board
                  // doctrine makes data color first-class, so the highlight
                  // takes the restored chart violet like every other chart
                  // on the platform.
                  "w-[4px] rounded-[1px]",
                  i >= 9 && i <= 13 ? "bg-(--chart-1)" : "bg-foreground/25",
                )}
                style={{ height: `${(h / 24) * 100}%` }}
              />
            ))}
          </div>
          <QrNode code="a" size={92} tone="plain" />
        </StationStage>
        <div className="mt-4 flex justify-center lg:absolute lg:inset-x-0 lg:top-[170px] lg:mt-0">
          <span className="font-mono text-[12px] text-muted-foreground">
            1,284 scans · 30 days
          </span>
        </div>
      </StationArt>
      <StationMeta
        label="Track"
        title="Track scan analytics"
        note="Every scan by day, country, city, device and referrer. Rolled up daily, honest about bots."
      />
    </Station>
  );
}

function RepointStation() {
  return (
    <Station>
      <StationArt>
        <StationTick />
        <StationStage>
          <QrNode />
        </StationStage>
        <div className="mt-4 flex justify-center lg:absolute lg:inset-x-0 lg:top-[170px] lg:mt-0">
          <div className="flex flex-col items-center gap-2 font-mono text-[12px]">
            <span className="text-muted-foreground opacity-65 line-through decoration-1">
              yourcafe.com/menu
            </span>
            <span className="flex items-center gap-2 text-foreground">
              <span aria-hidden className={cn("size-[6px] rounded-full", HUE_CLASSES["dest-1"].dot)} />
              yourcafe.com/winter
            </span>
          </div>
        </div>
      </StationArt>
      <StationMeta
        label="Update"
        title="Update links anytime"
        note="Repoint a code after it is printed. The code on the wall never changes, only where it sends people."
      />
    </Station>
  );
}

export function Filmstrip() {
  return (
    <div className="relative mt-block">
      <PrintCodeDefs codes={Object.values(CODES)} />
      {/* The baseline every station's primary object sits on — spans the
          section's content measure. (The frame="bleed" experiment was
          reverted at U2 round 2: a full-viewport hairline read as a line
          ACROSS the section, not a baseline under it.) */}
      <span
        aria-hidden
        className="hidden lg:absolute lg:inset-x-0 lg:top-[152px] lg:block lg:h-px lg:bg-border"
      />
      <div className="relative grid grid-cols-1 gap-y-12 lg:grid-cols-4 lg:gap-x-[clamp(1.5rem,2.6vw,3rem)] lg:gap-y-0">
        <SetStation />
        <PrintStation />
        <TrackStation />
        <RepointStation />
      </div>
      <div>
        <div className="relative mt-7 lg:mt-10">
          <span aria-hidden className="hidden lg:absolute lg:inset-x-0 lg:top-1/2 lg:block lg:h-px lg:bg-border" />
          {/* The knockout has to match the plate this section sits on, not
              the page field. P9.10-D4 moved the section to `surface="tint"`
              on promotion to 01, and `bg-background` immediately read as a
              darker pill floating on the lighter plate. Pinned to the same
              token the Section applies rather than left to inherit, because
              the rule it is knocking out is a sibling, not an ancestor. */}
          <p className="relative mx-auto w-fit bg-transparent px-0 font-mono text-[11px] text-muted-foreground lg:bg-surface-tint lg:px-3.5">
            one code, design to scan · no reprints, ever
          </p>
        </div>
      </div>
    </div>
  );
}
