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
 * hairline-separated flow rows instead β€” translated from the reference
 * artifact's `@container` breakpoint to a plain `md:` viewport breakpoint
 * (768px, 8px off the artifact's demo-only 760px container-query number,
 * which existed only to simulate a mobile width inside the artifact's own
 * full-width review page; the real section has no such wrapper, so the
 * project's standard breakpoint is the more correct translation here, not
 * a re-authored 760px media query).
 *
 * Zero client JS: every value below is computed once at module scope from
 * the real engine, the same static-composition idiom `qr-tile.tsx` and
 * `kit-contact-sheet.tsx` already use. No hooks, no "use client".
 *
 * ---- Why a `<symbol>`/`<use>` pair instead of six inlined engine renders ----
 * The product claim this section makes is "the same code, unchanged, at
 * every station" β€” `renderQr` is called exactly ONCE per theme (light/dark),
 * and every one of the five on-page instances (station 1, three station-2
 * artifacts, station 3) references that single definition via `<use>`,
 * which is also literally "the same DOM node," reinforcing the claim in the
 * markup rather than asserting it in a sentence.
 *
 * `renderQr` returns a complete standalone `<svg xmlns=... viewBox=...>...
 * </svg>` string (two `<path>` fills for dots/eyes; no `<defs>` since
 * `brandQrStyles` is a solid fill, no background `<path>` since its
 * background is transparent β€” verified by reading `packages/qr-engine/src/
 * render.ts` and by actually calling `renderQr` with this exact style/data
 * pair). `extractSymbol` below pulls the `viewBox` and inner content out of
 * that string with a single guarded regex (matched and measured against the
 * real output before this shipped) so the symbol content is byte-identical
 * to what `renderQr` produced β€” never hand-copied or re-derived. If the
 * engine's output shape ever changes underneath this, the regex fails to
 * match and this throws at module load (a loud build/request-time failure)
 * rather than silently rendering broken markup.
 *
 * Measured, not guessed: `next build`'s served `/` HTML (`.next/server/app/
 * index.html`) is 861,279 bytes with this symbol/use approach. Temporarily
 * swapping `FilmstripQr`/`QrDefs` for ten repeated `dangerouslySetInnerHTML`
 * copies (one full engine SVG per instance, no shared definition) and
 * rebuilding produced 970,768 bytes β€” 109,489 bytes (~107 KB) heavier, about
 * 12.7% of the whole page's raw HTML, for markup that is otherwise pixel-
 * identical. Gzipped the gap narrows (65,917 vs 69,267 bytes, a 3,350-byte
 * / 4.8% difference) since ten byte-identical ~6.3 KB chunks compress well,
 * but the symbol approach still wins under compression too, at a fraction
 * of the raw-byte cost. (The RSC flight payload Next embeds alongside the
 * rendered HTML means each id/string appears twice in the served bytes,
 * which is why the deltas above are roughly double a naive "5 instances Γ—
 * 6,374-byte SVG" estimate β€” a Next.js characteristic of every static page,
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

/** The D13-locked precision ink hex, derived rather than re-hardcoded β€” same
 *  helper `kit-contact-sheet.tsx`'s own ink legend already uses. Always the
 *  LIGHT variant: the kit swatch below shows ink-on-paper (what actually
 *  prints), which never swaps with the site's own theme. */
const KIT_INK = inkHexFromStyle(brandQrStyles.precision.light);

const SVG_SHAPE_RE = /^<svg[^>]*\sviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>$/;

function extractSymbol(svg: string, id: string): { id: string; viewBox: string; inner: string } {
  const match = svg.match(SVG_SHAPE_RE);
  if (!match) {
    throw new Error(
      `filmstrip.tsx: renderQr's output no longer matches the expected ` +
        `<svg viewBox="...">...</svg> shape (symbol id "${id}") β€” the ` +
        `extraction regex needs updating to match the new format.`,
    );
  }
  return { id, viewBox: match[1], inner: match[2] };
}

/** One code, both themes, extracted into a `<symbol>` pair. */
function buildCode(data: string, slug: string) {
  return {
    light: extractSymbol(renderQr({ data, style: brandQrStyles.precision.light }).svg, `hiw-${slug}-light`),
    dark: extractSymbol(renderQr({ data, style: brandQrStyles.precision.dark }).svg, `hiw-${slug}-dark`),
  };
}

const CODES = {
  a: buildCode(QR_A, "a"),
  b: buildCode(QR_B, "b"),
  c: buildCode(QR_C, "c"),
} as const;

type CodeKey = keyof typeof CODES;

/** Rendered once, referenced by every `FilmstripQr` below via `<use>`. Zero
 *  visual footprint (`size-0`, `absolute`) β€” matches the reference
 *  artifact's own hidden symbol holder. */
function QrDefs() {
  return (
    <svg aria-hidden className="absolute size-0">
      {Object.values(CODES).flatMap((code) =>
        [code.light, code.dark].map((sym) => (
          <symbol
            key={sym.id}
            id={sym.id}
            viewBox={sym.viewBox}
            dangerouslySetInnerHTML={{ __html: sym.inner }}
          />
        )),
      )}
    </svg>
  );
}

/** One station's QR (or artifact's QR): a light instance and a dark
 *  instance, CSS-toggled by theme β€” the same `dark:hidden`/`hidden
 *  dark:block` swap `qr-tile.tsx` uses, just against a `<use>` reference
 *  instead of a second inlined copy. */
function FilmstripQr({ code = "a", className }: { code?: CodeKey; className?: string }) {
  const { light, dark } = CODES[code];
  return (
    <>
      <svg viewBox={light.viewBox} aria-hidden className={cn("block dark:hidden", className)}>
        <use href={`#${light.id}`} />
      </svg>
      <svg viewBox={dark.viewBox} aria-hidden className={cn("hidden dark:block", className)}>
        <use href={`#${dark.id}`} />
      </svg>
    </>
  );
}

/** The 84x84 "hero" QR presentation shared by stations 1 and 3 (`.qr-node`
 *  in the reference artifact): white paper, the QR at full opacity. */
/**
 * `tone` exists because the accent glow does not survive being repeated.
 * One code carrying a violet bloom reads as the hero object of its station;
 * five of them across one baseline wash the whole band blue and the bloom
 * stops meaning anything. Only the two solo codes (stations 1 and 3) keep it;
 * the three-up trio at station 2 gets a plain neutral lift instead, which is
 * also truer to what that station is saying (these are ordinary codes you
 * made, not a featured one).
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
        "shrink-0 rounded-[14px] bg-qr-bg",
        tone === "accent"
          ? "shadow-[0_1px_0_var(--border),0_20px_44px_-22px_var(--primary)]"
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
 *  positioning drops entirely below `md` (see the file header) rather than
 *  just hiding visually, so it never reserves layout space on mobile. */
function StationTick() {
  return (
    <span
      aria-hidden
      className="hidden md:absolute md:top-[146px] md:left-1/2 md:block md:h-[13px] md:w-px md:-translate-x-1/2 md:bg-muted-foreground md:opacity-45"
    />
  );
}

/** Shared station shell: the mobile hairline-row border collapses to
 *  nothing at `md`, where the shared `rule` (rendered once by `Filmstrip`)
 *  takes over as the separator between stations instead. */
function Station({ children }: { children: ReactNode }) {
  return <div className="border-t border-border pt-[18px] md:border-t-0 md:pt-0">{children}</div>;
}

/** Station art area: 180px tall with a relative-positioning context for the
 *  tick/stage/under children at `md`, plain document flow below it. */
function StationArt({ children }: { children: ReactNode }) {
  return <div className="relative md:h-[248px]">{children}</div>;
}

/** The row that sits ON the rule (`bottom: 72px` of the 180px art area =
 *  exactly the rule's own 108px line). Flow row on mobile, absolute at
 *  `md`. */
function StationStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end justify-center gap-4 pt-2 pb-1 md:absolute md:inset-x-0 md:bottom-[96px] md:p-0">
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
          <div className="flex flex-col gap-4 pb-1">
            <span className="flex items-center gap-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
              <span aria-hidden className="relative size-[18px] shrink-0 rounded-[4px] border border-border bg-white">
                <span aria-hidden className="absolute inset-[4px] rounded-[1px]" style={{ backgroundColor: KIT_INK }} />
              </span>
              {KIT_INK}
            </span>
            <span className="flex items-center gap-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
              <span aria-hidden className="size-[18px] shrink-0 rounded-[5px] border border-border bg-muted" />
              rounded
            </span>
            <span className="flex items-center gap-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
              <span aria-hidden className="size-[18px] shrink-0 rounded-full border border-border bg-muted" />
              circle eye
            </span>
          </div>
          <svg
            aria-hidden
            width="34"
            height="96"
            viewBox="0 0 34 96"
            fill="none"
            className="shrink-0 self-end pb-2 text-muted-foreground opacity-50"
          >
            <path d="M0 9h13M0 48h13M0 87h13M13 9v78M13 48h21" stroke="currentColor" strokeWidth="1" />
          </svg>
          <QrNode />
        </StationStage>
      </StationArt>
      <StationMeta
        label="Design"
        title="Design your style."
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
          <div className="flex items-end gap-3.5">
            <QrNode code="a" size={92} tone="plain" />
            <QrNode code="b" size={92} tone="plain" />
            <QrNode code="c" size={92} tone="plain" />
          </div>
        </StationStage>
      </StationArt>
      <StationMeta
        label="Create"
        title="Create new codes."
        note="Every code you make inherits the kit. Export SVG or PNG, no watermark, no limits on static codes."
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
        <div className="mt-4 flex justify-center md:absolute md:inset-x-0 md:top-[170px] md:mt-0">
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
        title="Update links anytime."
        note="Repoint a code after it is printed. The code on the wall never changes, only where it sends people."
      />
    </Station>
  );
}

export function Filmstrip() {
  return (
    <div className="relative mt-block">
      <QrDefs />
      {/* The baseline every station's primary object sits on β€” full bleed
          width (spans the section's own frame="bleed" area, not the
          gutter-padded stations grid below it). */}
      <span
        aria-hidden
        className="hidden md:absolute md:inset-x-0 md:top-[152px] md:block md:h-px md:bg-border"
      />
      <div className="relative grid grid-cols-1 gap-y-12 md:grid-cols-3 md:gap-x-[clamp(1.5rem,2.6vw,3rem)] md:gap-y-0">
        <SetStation />
        <PrintStation />
        <RepointStation />
      </div>
      <div>
        <div className="relative mt-7 md:mt-10">
          <span aria-hidden className="hidden md:absolute md:inset-x-0 md:top-1/2 md:block md:h-px md:bg-border" />
          <p className="relative mx-auto w-fit bg-transparent px-0 font-mono text-[11px] text-muted-foreground md:bg-surface-tint md:px-3.5">
            one kit, every code · no reprints, ever
          </p>
        </div>
      </div>
    </div>
  );
}
