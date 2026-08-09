import type { ReactNode } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { brandQrStyles } from "@/lib/brand-qr";
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
 * ---- Why a `<symbol>`/`<use>` pair instead of six inlined engine renders ----
 * The product claim this section makes is "the same code, unchanged, at
 * every station" — `renderQr` is called exactly ONCE per theme (light/dark),
 * and every one of the five on-page instances (station 1, three station-2
 * artifacts, station 3) references that single definition via `<use>`,
 * which is also literally "the same DOM node," reinforcing the claim in the
 * markup rather than asserting it in a sentence.
 *
 * `renderQr` returns a complete standalone `<svg xmlns=... viewBox=...>...
 * </svg>` string (two `<path>` fills for dots/eyes; no `<defs>` since
 * `brandQrStyles` is a solid fill, no background `<path>` since its
 * background is transparent — verified by reading `packages/qr-engine/src/
 * render.ts` and by actually calling `renderQr` with this exact style/data
 * pair). `extractSymbol` below pulls the `viewBox` and inner content out of
 * that string with a single guarded regex (matched and measured against the
 * real output before this shipped) so the symbol content is byte-identical
 * to what `renderQr` produced — never hand-copied or re-derived. If the
 * engine's output shape ever changes underneath this, the regex fails to
 * match and this throws at module load (a loud build/request-time failure)
 * rather than silently rendering broken markup.
 *
 * Measured, not guessed: `next build`'s served `/` HTML (`.next/server/app/
 * index.html`) is 861,279 bytes with this symbol/use approach. Temporarily
 * swapping `FilmstripQr`/`QrDefs` for ten repeated `dangerouslySetInnerHTML`
 * copies (one full engine SVG per instance, no shared definition) and
 * rebuilding produced 970,768 bytes — 109,489 bytes (~107 KB) heavier, about
 * 12.7% of the whole page's raw HTML, for markup that is otherwise pixel-
 * identical. Gzipped the gap narrows (65,917 vs 69,267 bytes, a 3,350-byte
 * / 4.8% difference) since ten byte-identical ~6.3 KB chunks compress well,
 * but the symbol approach still wins under compression too, at a fraction
 * of the raw-byte cost. (The RSC flight payload Next embeds alongside the
 * rendered HTML means each id/string appears twice in the served bytes,
 * which is why the deltas above are roughly double a naive "5 instances ×
 * 6,374-byte SVG" estimate — a Next.js characteristic of every static page,
 * not specific to this section.)
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

const SVG_SHAPE_RE = /^<svg[^>]*\sviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/;

function extractSymbol(svg: string, id: string): { id: string; viewBox: string; inner: string } {
  const match = svg.match(SVG_SHAPE_RE);
  if (!match) {
    throw new Error(
      `filmstrip.tsx: renderQr's output no longer matches the expected ` +
        `<svg viewBox="...">...</svg> shape (symbol id "${id}"): the ` +
        `extraction regex needs updating to match the new format.`,
    );
  }
  return { id, viewBox: match[1], inner: match[2] };
}

/**
 * One code, extracted into a `<symbol>`.
 *
 * P9.10-D4 dropped the second (dark) render. Until this round every station
 * carried a light/dark PAIR and CSS-toggled between them, because the codes
 * sat directly on the page field and had to survive both themes. They no
 * longer sit on the field: every station is now ink on white paper, matching
 * the hero one section up and the `#131316` ink swatch this section prints
 * under station 1 — which the white-on-black code above it had been
 * contradicting. Paper does not have a dark mode, so the dark symbol was
 * markup nothing could ever reference.
 */
function buildCode(data: string, slug: string) {
  return extractSymbol(
    renderQr({ data, style: brandQrStyles.precision.light }).svg,
    `hiw-${slug}`,
  );
}

const CODES = {
  a: buildCode(QR_A, "a"),
  b: buildCode(QR_B, "b"),
  c: buildCode(QR_C, "c"),
} as const;

type CodeKey = keyof typeof CODES;

/** Rendered once, referenced by every `FilmstripQr` below via `<use>`. Zero
 *  visual footprint (`size-0`, `absolute`) — matches the reference
 *  artifact's own hidden symbol holder. */
function QrDefs() {
  return (
    <svg aria-hidden className="absolute size-0">
      {Object.values(CODES).map((sym) => (
        <symbol
          key={sym.id}
          id={sym.id}
          viewBox={sym.viewBox}
          dangerouslySetInnerHTML={{ __html: sym.inner }}
        />
      ))}
    </svg>
  );
}

/** One station's QR: a single `<use>` against the shared symbol. */
function FilmstripQr({
  code = "a",
  className,
}: {
  code?: CodeKey;
  className?: string;
}) {
  const sym = CODES[code];
  return (
    <svg viewBox={sym.viewBox} aria-hidden className={cn("block", className)}>
      <use href={`#${sym.id}`} />
    </svg>
  );
}

/** The 84x84 "hero" QR presentation shared by stations 1 and 3 (`.qr-node`
 *  in the reference artifact): white paper, the QR at full opacity. */
/**
 * `tone` exists because the featured code should not survive being repeated.
 * One code lifted off the baseline reads as the hero object of its station;
 * five of them lifted equally and the emphasis stops meaning anything. Only
 * the two solo codes (stations 1 and 3) get it; the three-up trio at station
 * 2 sits lower, which is also truer to what that station is saying (these
 * are ordinary codes you made, not a featured one).
 *
 * P9.10-D4: the accent used to be a VIOLET bloom (`var(--primary)` in the
 * shadow). Since the D13 monochrome amendment `--primary` computes identical
 * to `--foreground`, so the bloom had quietly become a white one — the same
 * dead violet-era glow D3 cut from the studio CTA, still lit here. The
 * monochrome answer to hierarchy is DEPTH, not hue: the featured code now
 * throws a deeper, softer shadow than the trio and nothing on this baseline
 * is tinted. It is also the hero's own physics one section up, where three
 * paper mats float on shadow alone.
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
  const pad = Math.round(size * 0.083);
  return (
    <div
      className={cn(
        "shrink-0 rounded-[14px]",
        "bg-white",
        tone === "accent"
          ? "shadow-[0_1px_0_var(--border),0_26px_54px_-24px_rgb(0_0_0/0.78)]"
          : "shadow-[0_1px_0_var(--border),0_12px_28px_-20px_rgb(0_0_0/0.55)]",
      )}
      style={{ width: size, height: size, padding: pad }}
    >
      <FilmstripQr code={code} className="h-full w-full" />
    </div>
  );
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
      <QrDefs />
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
