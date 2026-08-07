import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { ModuleMark } from "@/components/brand/marks";
import { cn } from "@/lib/utils";

/**
 * 04 Brand system's body (P9.9-C1, board pick: "B, the sync theatre, with
 * A's physicality"; motion = the C1-R2 "ripple", refined to the R2c
 * two-beat cycle). The section SHOWS the P9.8 flagship behavior instead of
 * captioning it: the Ember kit card is the control, three real print
 * artifacts are the fleet, and on a slow CSS loop (globals.css `ks-*`,
 * reduced-motion honored) the kit walks THREE states — day/leaf,
 * day/rounded (the board's mid state without the leaf eyes, instrument
 * score 100), night/leaf — with every artifact following each change via
 * a soft diagonal mask sweep (the "fluid transform"; a true eye-shape
 * path morph is Chromium-only). Mats sit STRAIGHT (board: rotated dark
 * strokes alias on the diagonal); physicality comes from paper shadows
 * and the ticket's punched notches instead.
 *
 * The night state (board-picked): #cff5ff ink on #18181b paper. That is
 * an INVERTED code (light modules on dark), which the instrument flags as
 * an 85/warning ("some older scanners") while the decode campaign harness
 * passes it empirically: zxing round-trips 4/4 payloads including the
 * 35-char worst case at 15.3:1 contrast. The board chose the assignment
 * explicitly with that verdict reported; flipping ink/paper roles back to
 * normal polarity (score 100) is a two-line change here if the call ever
 * reverses. Replaces `kit-contact-sheet.tsx` (deleted at C1), whose four
 * visual defects are recorded in the C1 exploration artifact.
 *
 * "Ember" replaces "Café Norte" as the recurring demo brand (board note) —
 * the playground presets and state-cards carry the same rename, so the
 * cast stays one brand across sections. Everything here is
 * server-rendered: NINE engine renders at module scope (3 payloads x 3
 * kit states, the qr-tile.tsx pattern), zero client JS. Payload-weight
 * note: ~3 x 35KB raw SVG rode in with the third state (compresses ~5x
 * on the wire); the matrices differ per payload, so filmstrip's
 * symbol/use sharing cannot apply here.
 */

const DAY_INK = "#131316";
const DAY_PAPER = "#ffffff";
const NIGHT_INK = "#cff5ff";
const NIGHT_PAPER = "#18181b";

function emberStyle(ink: string, paper: string, eyeFrame: "leaf" | "rounded") {
  return parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: eyeFrame, pupil: "rounded", color: null },
    fill: { type: "solid", color: ink },
    background: { transparent: false, color: paper },
  });
}

const STYLE_DAY = emberStyle(DAY_INK, DAY_PAPER, "leaf");
const STYLE_MID = emberStyle(DAY_INK, DAY_PAPER, "rounded");
const STYLE_NIGHT = emberStyle(NIGHT_INK, NIGHT_PAPER, "leaf");

interface Artifact {
  payload: string;
  label: string;
  caption: string;
  /** the ticket carries the punched notches */
  ticket?: boolean;
}

const ARTIFACTS: Artifact[] = [
  { payload: "HTTPS://QRCDN.COM/MENU", label: "qrcdn.com/menu", caption: "table tent" },
  { payload: "HTTPS://QRCDN.COM/HOURS", label: "qrcdn.com/hours", caption: "door sticker" },
  { payload: "HTTPS://QRCDN.COM/EVENTS", label: "qrcdn.com/events", caption: "ticket", ticket: true },
];

const RENDERS = ARTIFACTS.map(({ payload }) => ({
  day: renderQr({ data: payload, style: STYLE_DAY }).svg,
  mid: renderQr({ data: payload, style: STYLE_MID }).svg,
  night: renderQr({ data: payload, style: STYLE_NIGHT }).svg,
}));

function PaperSwatch({ className }: { className?: string }) {
  return (
    <span className={cn("size-4 rounded-[5px] border border-white/25", className)} aria-hidden />
  );
}

const POP_PHASE_CLASS = {
  /** visible from rest, pops out at beat 1 (the eyes' first value) */
  outB1: "ks-ch-out-b1",
  /** pops in at beat 1, out at beat 2 (the mid state's value) */
  mid: "ks-ch-mid",
  /** pops in at beat 2 (every final value) */
  inB2: "ks-ch-in-b2",
  /** visible until beat 2 (the hex/paper before-values) */
  outB2: "ks-ch-out-b2",
} as const;

/** The slowed number-pop-in (transitions.dev 02) for a kit property value:
 *  each character rides its own phase-shifted 12s cycle (90ms stagger,
 *  the reference's bounce curve on entrances, ~840ms per char — "a slower
 *  version" per the board; exits run snappier by design). Monospace keeps
 *  the stacked values character-aligned. */
function PopChars({ value, phase }: { value: string; phase: keyof typeof POP_PHASE_CLASS }) {
  return (
    <>
      {value.split("").map((ch, i) => (
        <span
          // a value's chars are positionally stable across the loop
          key={i}
          className={POP_PHASE_CLASS[phase]}
          style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

/** A stacked property value: phases layered in one fixed-width slot. */
function ValueSlot({ layers }: { layers: Array<[keyof typeof POP_PHASE_CLASS, string]> }) {
  return (
    <span className="relative inline-flex h-[1.2em] w-[7ch] items-center">
      {layers.map(([phase, value]) => (
        <span key={phase} className="absolute inset-0 flex items-center justify-end">
          <PopChars value={value} phase={phase} />
        </span>
      ))}
    </span>
  );
}

export function KitSyncTheatre() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
      {/* The control: the kit card — a clean change between kit states, no
          simulated app chrome (C1-R2 board refinement: a button in a demo
          reads as clickable). Purely presentational. */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm">
        <p className="mb-3 flex items-center gap-2.5 font-medium text-foreground">
          {/* The kit identity in miniature: the ink-tinted ModuleMark on its
              own paper chip (a dark ink on a dark UI card would vanish
              without the chip), flipping at the night beat. */}
          <span className="relative inline-flex size-5" aria-hidden>
            <span className="absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-white">
              <ModuleMark className="size-3 text-[#131316]" />
            </span>
            <span className="ks-in-b2 absolute inset-0 flex items-center justify-center rounded-[5px] border border-white/25 bg-[#18181b]">
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
              <ValueSlot
                layers={[
                  ["outB2", "#131316"],
                  ["inB2", "#cff5ff"],
                ]}
              />
              <span className="relative inline-flex size-3.5">
                <PaperSwatch className="absolute inset-0 size-3.5 bg-[#131316]" />
                <PaperSwatch className="ks-in-b2 absolute inset-0 size-3.5 bg-[#cff5ff]" />
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>paper</dt>
            <dd className="flex items-center gap-1.5 text-foreground/80">
              <ValueSlot
                layers={[
                  ["outB2", "#ffffff"],
                  ["inB2", "#18181b"],
                ]}
              />
              <span className="relative inline-flex size-3.5">
                <PaperSwatch className="absolute inset-0 size-3.5 bg-white" />
                <PaperSwatch className="ks-in-b2 absolute inset-0 size-3.5 bg-[#18181b]" />
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>modules</dt>
            <dd>rounded · 0.88</dd>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/60 py-2">
            <dt>eyes</dt>
            <dd className="text-foreground/80">
              {/* the two-beat property: leaf pops out at beat 1, rounded
                  lives between the beats, leaf returns with the night kit */}
              <ValueSlot
                layers={[
                  ["outB1", "leaf"],
                  ["mid", "rounded"],
                  ["inB2", "leaf"],
                ]}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 py-2">
            <dt>attached codes</dt>
            <dd>3</dd>
          </div>
        </dl>
      </div>

      {/* The fleet: three print artifacts, straight-set (no rotation: the
          board flagged aliasing on rotated dark strokes), paper-white on
          the dark page, each following every kit change via the soft
          diagonal mask sweep. The mat IS the artifact's paper, so the
          night beat recolors the whole object, not just the code. */}
      <div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
          {ARTIFACTS.map((artifact, i) => (
            <figure
              key={artifact.payload}
              className={cn(
                "relative m-0 flex flex-col gap-2 rounded-xl p-3.5",
                "bg-white shadow-[0_22px_44px_-20px_rgb(0_0_0/0.8),0_5px_14px_-7px_rgb(0_0_0/0.55)]",
                // the ripple: mats 2 and 3 phase-shift their whole cycle
                // (globals.css `.ks-m2/.ks-m3` animation-delay)
                i === 1 && "ks-m2",
                i === 2 && "ks-m3",
              )}
            >
              {/* night-state paper wash over the whole mat, riding the
                  same beat-2 sweep as the code */}
              <span
                aria-hidden
                className="ks-sweep ks-sweep-c pointer-events-none absolute inset-0 rounded-xl bg-[#18181b]"
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
                  dangerouslySetInnerHTML={{ __html: RENDERS[i].day }}
                />
                <span
                  className="ks-sweep ks-sweep-b absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: RENDERS[i].mid }}
                />
                <span
                  className="ks-sweep ks-sweep-c absolute inset-0 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: RENDERS[i].night }}
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
