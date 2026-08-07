import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { ModuleMark } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

/**
 * 04 Brand system's body (P9.9-C1, board pick: "B, the sync theatre, with
 * A's physicality"). The section SHOWS the P9.8 flagship behavior instead
 * of captioning it: the Ember kit card is the control, three real print
 * artifacts are the fleet, and on a slow CSS loop (globals.css `ks-*`,
 * reduced-motion honored) a kit edit propagates to every artifact in the
 * same breath, closing on the app's real save note.
 *
 * The demo edit (board-picked, 2026-08-06 polish round) flips the kit to
 * its night state: #cff5ff ink on #18181b paper. That is an INVERTED
 * code (light modules on dark), which the instrument flags as an
 * 85/warning ("some older scanners") while the decode campaign harness
 * passes it empirically: zxing round-trips 4/4 payloads including the
 * 35-char worst case at 15.3:1 contrast (verified at build time of the
 * color change). The board chose the assignment explicitly with that
 * verdict reported; flipping ink/paper roles back to normal polarity
 * (score 100) is a two-line change here if the call ever reverses.
 * Replaces `kit-contact-sheet.tsx` (deleted at C1), whose four visual
 * defects are recorded in the C1 exploration artifact.
 *
 * "Ember" replaces "Café Norte" as the recurring demo brand (board note) —
 * the playground presets and state-cards carry the same rename, so the
 * cast stays one brand across sections. Everything here is
 * server-rendered: six engine renders at module scope (the qr-tile.tsx
 * pattern), zero client JS.
 */

const INK_BEFORE = "#131316";
const PAPER_BEFORE = "#ffffff";
const INK_AFTER = "#cff5ff";
const PAPER_AFTER = "#18181b";

function emberStyle(ink: string, paper: string) {
  return parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: "leaf", pupil: "rounded", color: null },
    fill: { type: "solid", color: ink },
    background: { transparent: false, color: paper },
  });
}

const STYLE_BEFORE = emberStyle(INK_BEFORE, PAPER_BEFORE);
const STYLE_AFTER = emberStyle(INK_AFTER, PAPER_AFTER);

interface Artifact {
  payload: string;
  label: string;
  caption: string;
  /** physicality: per-mat rotation + a punched notch on the ticket */
  rotate: string;
  ticket?: boolean;
}

const ARTIFACTS: Artifact[] = [
  {
    payload: "HTTPS://QRCDN.COM/MENU",
    label: "qrcdn.com/menu",
    caption: "table tent",
    rotate: "-rotate-2",
  },
  {
    payload: "HTTPS://QRCDN.COM/HOURS",
    label: "qrcdn.com/hours",
    caption: "door sticker",
    rotate: "rotate-1",
  },
  {
    payload: "HTTPS://QRCDN.COM/EVENTS",
    label: "qrcdn.com/events",
    caption: "ticket",
    rotate: "-rotate-1",
    ticket: true,
  },
];

const RENDERS = ARTIFACTS.map(({ payload }) => ({
  before: renderQr({ data: payload, style: STYLE_BEFORE }).svg,
  after: renderQr({ data: payload, style: STYLE_AFTER }).svg,
}));

function PaperSwatch({ className }: { className?: string }) {
  return (
    <span className={cn("size-4 rounded-[5px] border border-white/25", className)} aria-hidden />
  );
}

/** The slowed number-pop-in (transitions.dev 02) for a kit property value:
 *  each character rides its own phase-shifted 9s cycle (90ms stagger, the
 *  reference's bounce curve, ~720ms per char — "a slower version" per the
 *  board). `tone="out"` is the old value rising away; exits run snappier
 *  than entrances by design. Monospace keeps the two stacked values
 *  character-aligned. */
function PopChars({ value, tone }: { value: string; tone: "in" | "out" }) {
  return (
    <>
      {value.split("").map((ch, i) => (
        <span
          // a hex value's chars are positionally stable across the loop
          key={i}
          className={tone === "in" ? "ks-ch-in" : "ks-ch-out"}
          style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

export function KitSyncTheatre() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
      {/* The control: the kit card. C1-R2 refinement per the board: NO
          simulated app flow (a save button in a demo reads as clickable),
          just a clean change between two kit states — the ink-tinted
          ModuleMark identity chip, mono hex values popping in per
          character (the slowed number-pop-in), and the full style row
          set. Purely presentational. */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm">
        <p className="mb-3 flex items-center gap-2.5 font-medium text-foreground">
          {/* The kit identity in miniature: the ink-tinted ModuleMark on its
              own paper chip (a dark ink on a dark UI card would vanish
              without the chip), both flipping at the edit beat. */}
          <span className="relative inline-flex size-5" aria-hidden>
            <span className="absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-white">
              <ModuleMark className="size-3 text-[#131316]" />
            </span>
            <span className="ks-edit absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#18181b]">
              <ModuleMark className="size-3 text-[#cff5ff]" />
            </span>
          </span>
          <span>Ember</span>
          <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
            kit
          </span>
        </p>
        <dl className="font-mono text-[0.66rem] text-muted-foreground">
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>ink</dt>
            <dd className="flex items-center gap-1.5 text-foreground/80">
              <span className="relative inline-flex h-[1.2em] w-[7ch] items-center">
                <span className="absolute inset-0 flex items-center justify-end">
                  <PopChars value="#131316" tone="out" />
                </span>
                <span className="absolute inset-0 flex items-center justify-end">
                  <PopChars value="#cff5ff" tone="in" />
                </span>
              </span>
              <span className="relative inline-flex size-3.5">
                <PaperSwatch className="absolute inset-0 size-3.5 bg-[#131316]" />
                <PaperSwatch className="ks-edit absolute inset-0 size-3.5 bg-[#cff5ff]" />
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>paper</dt>
            <dd className="flex items-center gap-1.5 text-foreground/80">
              <span className="relative inline-flex h-[1.2em] w-[7ch] items-center">
                <span className="absolute inset-0 flex items-center justify-end">
                  <PopChars value="#ffffff" tone="out" />
                </span>
                <span className="absolute inset-0 flex items-center justify-end">
                  <PopChars value="#18181b" tone="in" />
                </span>
              </span>
              <span className="relative inline-flex size-3.5">
                <PaperSwatch className="absolute inset-0 size-3.5 bg-white" />
                <PaperSwatch className="ks-edit absolute inset-0 size-3.5 bg-[#18181b]" />
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>modules</dt>
            <dd>rounded · 0.88</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>eyes</dt>
            <dd>leaf</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>attached codes</dt>
            <dd>3</dd>
          </div>
        </dl>
      </div>

      {/* The fleet: three print artifacts, paper-white on the dark page,
          each re-rendering in the same breath as the kit edit. The mat IS
          the artifact's paper, so the whole object recolors, not just the
          code. */}
      <div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
          {ARTIFACTS.map((artifact, i) => (
            <figure
              key={artifact.payload}
              className={cn(
                "relative m-0 flex flex-col gap-2 rounded-xl p-3.5",
                "bg-white shadow-[0_22px_44px_-20px_rgb(0_0_0/0.8),0_5px_14px_-7px_rgb(0_0_0/0.55)]",
                artifact.rotate,
                // the ripple: mats 2 and 3 phase-shift their whole cycle
                // (globals.css `.ks-m2/.ks-m3` animation-delay)
                i === 1 && "ks-m2",
                i === 2 && "ks-m3",
              )}
            >
              {/* after-state paper wash over the whole mat */}
              <span
                aria-hidden
                className="ks-after pointer-events-none absolute inset-0 rounded-xl bg-[#18181b]"
              />
              {artifact.ticket && (
                <>
                  {/* punched notches: the page background showing through —
                      only readable as holes now that the page is dark
                      (P9.9-C0.6), the exact detail the old contact sheet got
                      wrong with a grey token fill. */}
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-background"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-background"
                  />
                </>
              )}
              <span className="relative">
                <span
                  className="[&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: RENDERS[i].before }}
                />
                <span
                  className="ks-after absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: RENDERS[i].after }}
                />
              </span>
              {/* ks-caption: the label must survive the mat's paper flip —
                  #6b6b74 works on white but dies on #18181b, so the color
                  rides the same timeline (globals.css). */}
              <figcaption className="ks-caption relative flex items-baseline justify-between font-mono text-[0.6rem]">
                <span>{artifact.label}</span>
                <span>{artifact.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        {/* The app's real save note, verbatim shape (kit-bar.tsx): the
            moment the section exists to show. */}
        <p className="ks-note mt-5 font-mono text-xs text-muted-foreground">
          Style applied to 3 attached codes.
        </p>
      </div>
    </div>
  );
}
