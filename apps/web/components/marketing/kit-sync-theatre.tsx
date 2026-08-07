import { renderQr } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { cn } from "@/lib/utils";

/**
 * 04 Brand system's body (P9.9-C1, board pick: "B, the sync theatre, with
 * A's physicality"). The section SHOWS the P9.8 flagship behavior instead
 * of captioning it: the Ember kit card is the control, three real print
 * artifacts are the fleet, and on a slow CSS loop (globals.css `ks-*`,
 * reduced-motion honored) a kit edit propagates to every artifact in the
 * same breath, closing on the app's real save note.
 *
 * The demo edit flips the kit's PAPER to #f45b05 (board-picked hex), not
 * its ink: #f45b05 as INK scores 85 with a marginal-contrast warning
 * (3.31:1 < the engine's 4:1 CONTRAST_WARN_MIN) — the demo kit must never
 * be something our own instrument flags, one section above "Know it scans
 * before you print it." Espresso ink on #f45b05 paper scores 100, zero
 * issues, 5.60:1 (verified through `scannabilityReport` at build time of
 * this unit). Replaces `kit-contact-sheet.tsx` (deleted this unit), whose
 * four visual defects are recorded in the C1 exploration artifact.
 *
 * "Ember" replaces "Café Norte" as the recurring demo brand (board note) —
 * the playground presets and state-cards carry the same rename, so the
 * cast stays one brand across sections. Everything here is
 * server-rendered: six engine renders at module scope (the qr-tile.tsx
 * pattern), zero client JS.
 */

const EMBER_INK = "#131316";
const EMBER_PAPER_EDITED = "#f45b05";

function emberStyle(paper: string) {
  return parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: "leaf", pupil: "rounded", color: null },
    fill: { type: "solid", color: EMBER_INK },
    background: { transparent: false, color: paper },
  });
}

const STYLE_BEFORE = emberStyle("#ffffff");
const STYLE_AFTER = emberStyle(EMBER_PAPER_EDITED);

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

export function KitSyncTheatre() {
  return (
    <div className="grid items-start gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
      {/* The control: the kit card. Decorative demo, not a form — the Save
          affordance is a styled div, never a button. */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm">
        <p className="mb-4 flex items-center gap-2.5 font-medium text-foreground">
          <span className="relative inline-flex size-4" aria-hidden>
            <PaperSwatch className="absolute inset-0 bg-white" />
            <PaperSwatch className="ks-after absolute inset-0 bg-[#f45b05]" />
          </span>
          Ember
        </p>
        <dl className="font-mono text-[0.68rem] text-muted-foreground">
          {(
            [
              ["ink", <span key="v">espresso</span>],
              [
                "paper",
                <span key="v" className="relative inline-flex size-4 align-middle">
                  <PaperSwatch className="absolute inset-0 bg-white" />
                  <PaperSwatch className="ks-after absolute inset-0 bg-[#f45b05]" />
                </span>,
              ],
              ["modules", <span key="v">rounded · 0.88</span>],
              ["eyes", <span key="v">leaf</span>],
              ["attached codes", <span key="v">3</span>],
            ] as const
          ).map(([term, value]) => (
            <div
              key={term}
              className="flex items-center justify-between border-t border-border/60 py-2 first:border-t-0"
            >
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div
          aria-hidden
          className="ks-save mt-4 rounded-lg bg-primary py-2 text-center text-[0.78rem] font-semibold text-primary-foreground"
        >
          Save changes
        </div>
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
              )}
            >
              {/* after-state paper wash over the whole mat */}
              <span
                aria-hidden
                className="ks-after pointer-events-none absolute inset-0 rounded-xl bg-[#f45b05]"
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
              <figcaption className="relative flex items-baseline justify-between font-mono text-[0.6rem] text-[#6b6b74]">
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
