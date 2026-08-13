"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { definePrintCode, PrintCodeDefs, PrintMat } from "@/components/marketing/print-mat";
import { DESTINATION_HUES, HUE_CLASSES, HUE_TINT, type DestinationLabel } from "./destination-hues";
import { cn } from "@/lib/utils";

/**
 * 05's body (P9.10-D5, second-passed at P9.10-D13), replacing the
 * `RetargetTheatre`.
 *
 * Board redirect at the D5 R1 review, and the whole shape of this file: R1
 * offered four compositions that all took the visual WIDER, and the note was
 * that they "didn't really add much information, just modified the visual for
 * the most part." Correct. The reference the board attached (GitBook's
 * enterprise section) earns its space a different way: one upgraded visual
 * stays CENTERED, and real content is arranged around it. So the round's job
 * turned out not to be a bigger stage; it was four claims this section was
 * making in cramped mono strips, or not making at all, given room to be read.
 *
 * P9.10-D13, the second pass (THE LIVE SWITCHBOARD), kept that composition
 * and rebuilt the plate's interior against two measured defects:
 *
 * 1. The demo was dead at rest ("pick a destination", nothing lit, nothing
 *    moving) while 03 idles under its light and 04 pulses every five
 *    seconds. Most visitors never click, so most visitors never saw this
 *    section's story happen. Now THE ATTRACT LOOP runs it for them: every
 *    four seconds the plate retargets itself to the next destination, and
 *    the first chip click cancels the loop permanently - the visitor has
 *    the keys from then on. Auto-retargets NEVER increment the counter:
 *    that number is the visitor's own proof of D14, and the machine
 *    inflating it would be fabrication.
 *
 * 2. A retarget had no payoff: the claim is "the same printed code now goes
 *    somewhere NEW", and the new place was never shown - a stroke changed
 *    color and one mono line updated. THE DESTINATION WINDOW at the plate's
 *    foot now shows where the code points: a small browser-idiom card whose
 *    address strip carries the full current URL and whose body is a
 *    distinct abstract wireframe per destination (a menu's price list, a
 *    seasonal banner, an order form). Honest by construction: grey blocks,
 *    no fake screenshots, the address line is the only text. The swap is
 *    the "risen destination" grammar 01's repoint card established.
 *
 * The constant is a real printed code carrying a real short address, the
 * SAME code 01's repoint card moves from /menu to /winter. Section 05 is
 * where a visitor gets to move it themselves, and the counter beneath turns
 * the unlimited-retargets guarantee (D14) into something they proved rather
 * than something we asserted.
 *
 * The routing graphic survived both rebuilds. R2 dropped it and the board's
 * note was immediate: "I do hate we're losing the cool routing graphic...
 * any way to retain that visual idea where the QR branches out to different
 * links?" It descends rather than fans sideways because a branch that
 * splits DOWNWARD suits a portrait plate.
 *
 * Client island on purpose. The board's standing note: "don't want us to
 * build a lesser feature because we're scared of a little bit of
 * JavaScript." Still no motion library - plain state, one interval, and CSS
 * transitions.
 */

const CODE_SLUG = "qrcdn.com/cafe";
const PRINT_CODE = definePrintCode("HTTPS://QRCDN.COM/CAFE", "d5-cafe");

/** One business repointing one printed code through its year. The three
 *  unrelated demo brands this used to show (a café, a ticketing site and an
 *  Instagram drop) demonstrated three customers, not one guarantee. */
const DESTINATIONS: readonly DestinationLabel[] = [
  "yourcafe.com/menu",
  "yourcafe.com/winter",
  "yourcafe.com/order",
];

/** The attract loop's cadence. 04's pulse edits every 5s; this sits just
 *  under it so the two neighbors never read as metronomes of one clock. */
const ATTRACT_MS = 4000;

/** The three share one host, so the chips print only what actually differs
 *  and the window's address strip prints the whole address. That is also
 *  what makes three chips fit a branch three-up inside a centred plate -
 *  full labels measured 152-160px each and wrapped 2+1, which is what
 *  pushed the earlier draft into a stacked list with nothing to branch to. */
const DEST_HOST = "yourcafe.com";
const destPath = (label: DestinationLabel) => label.slice(DEST_HOST.length);

/* The branch. One trunk leaves the code and splits three ways; the endpoints
   sit at 1/6, 3/6 and 5/6 of the width so they land on the centres of a
   three-column chip grid at any plate width. Same grammar the retired
   theatre used for its wires (active branch takes the destination's own hue
   at 2px, dormant ones stay border-grey) - the geometry changed, the
   language did not. D13 deepened it 74 -> 84px for the wider plate. */
const BRANCH_VIEW = { w: 300, h: 84 };
const BRANCH_X = [48, 150, 252] as const;
function branchPath(x: number): string {
  if (x === 150) return `M150 0V${BRANCH_VIEW.h}`;
  return `M150 0V24C150 58 ${x} 44 ${x} ${BRANCH_VIEW.h}`;
}

/** 16-grid line icon, the idiom section 09's feature strip established at
 *  P9.10-D2 - same viewBox, stroke weight and cap treatment, so the two
 *  feature families read as one system rather than two icon sets. */
function FeatureIcon({ d, extra }: { d: string; extra?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
      {extra}
    </svg>
  );
}

/**
 * The four claims. Every one is a fact the repo already holds, not a
 * marketing adjective: the D14 policy, the CLAUDE.md redirect rule, the
 * propagation ceiling this section already published in a mono strip, and
 * the downgrade guarantee (whose sentence /pricing's own guarantee strip
 * reuses verbatim, and e2e asserts there).
 */
const FEATURES: ReadonlyArray<{ icon: ReactNode; name: string; desc: string; side: "l" | "r" }> = [
  {
    icon: (
      <FeatureIcon
        d="M12.9 8a4.9 4.9 0 1 1-1.6-3.6M13.1 3.1v2.6h-2.6"
        extra={<circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />}
      />
    ),
    name: "Retarget anytime",
    desc: "Point a printed code somewhere new in seconds. Unlimited on both plans, never a numeric cap.",
    side: "l",
  },
  {
    icon: <FeatureIcon d="M8 2.7v5.9M5.7 6.4 8 8.7l2.3-2.3M3.1 11v1.5c0 .4.3.8.8.8h8.2c.5 0 .8-.4.8-.8V11M2.7 13.3 13.3 2.7" />,
    name: "Never cached",
    desc: "A 302 with no-store, never a 301. Every scan asks us where to go, so an edit is never stuck in someone's browser.",
    side: "l",
  },
  {
    icon: <FeatureIcon d="M8 4.7V8l2.3 1.3" extra={<circle cx="8" cy="8" r="5.4" />} />,
    name: "Live at the edge",
    desc: "Changes reach the redirect Worker in seconds, five minutes worst case, on Cloudflare's network.",
    side: "r",
  },
  {
    icon: <FeatureIcon d="M5.3 5.7a2.3 2.3 0 1 0 0 4.6c1.6 0 2-1.15 2.7-2.3.7-1.15 1.1-2.3 2.7-2.3a2.3 2.3 0 1 1 0 4.6c-1.6 0-2-1.15-2.7-2.3" />,
    name: "Your code never dies",
    desc: "Free codes are never deactivated, and a downgrade never breaks a printed code.",
    side: "r",
  },
];

/** Centre-aligned on the board's call at the R2 review. The section is
 *  symmetric now - centred heading, centred plate, a column of claims either
 *  side - and left-aligned cards were the one thing still reading as the old
 *  left-aligned section pattern inside a composition that had left it. */
function Feature({ icon, name, desc }: { icon: ReactNode; name: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="lit-stroke grid size-9 place-items-center rounded-[11px] text-foreground">
        {icon}
      </span>
      <span className="text-[1.0625rem] leading-snug font-medium text-balance text-foreground">
        {name}
      </span>
      <p className="max-w-[30ch] text-[0.9375rem] leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function hue(label: DestinationLabel) {
  return HUE_CLASSES[DESTINATION_HUES[label]];
}
function tint(label: DestinationLabel) {
  return HUE_TINT[DESTINATION_HUES[label]];
}

/** The destination pages as abstract wireframes - grey blocks only, no fake
 *  screenshots and no invented content (the address strip is the window's
 *  only text). Each destination gets a DISTINCT silhouette so a swap reads
 *  as a different page at a glance: the menu's title-and-price-list, the
 *  seasonal banner, the order form. All three fill the same fixed-height
 *  body, so the plate never changes height as destinations swap (zero
 *  layout shift under the attract loop). */
function WindowBody({ active }: { active: DestinationLabel }) {
  if (active === "yourcafe.com/menu") {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="h-2.5 w-2/5 rounded-full bg-foreground/15" />
        {(
          [
            ["m1", "w-1/2"],
            ["m2", "w-2/5"],
            ["m3", "w-[45%]"],
          ] as const
        ).map(([key, w]) => (
          <div key={key} className="flex items-center justify-between">
            <div className={cn("h-2 rounded-full bg-foreground/10", w)} />
            <div className="h-2 w-7 rounded-full bg-foreground/10" />
          </div>
        ))}
      </div>
    );
  }
  if (active === "yourcafe.com/winter") {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="h-10 w-full rounded-lg bg-foreground/10" />
        <div className="h-2 w-3/4 rounded-full bg-foreground/10" />
        <div className="h-2 w-3/5 rounded-full bg-foreground/10" />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="h-6 w-full rounded-md border border-foreground/10 bg-foreground/[0.04]" />
      <div className="h-6 w-full rounded-md border border-foreground/10 bg-foreground/[0.04]" />
      <div className="h-6 w-24 rounded-md bg-foreground/20" />
    </div>
  );
}

/**
 * The destination window (D13): the retarget's payoff. A small
 * browser-idiom card - dot trio, address strip carrying the full current
 * URL with the destination's own hue dot, wireframe body. The body is
 * KEYED by destination so only the active wireframe is ever in the DOM
 * (the served-HTML opacity:0 sweep stays trivially clean) and the enter
 * animation replays on every retarget, attract or visitor. The rise+fade
 * lives in globals.css's dw block behind the reduced-motion gate; reduced
 * motion gets an instant swap.
 */
function DestinationWindow({ active }: { active: DestinationLabel }) {
  return (
    <div
      data-slot="destination-window"
      className="mt-5 overflow-hidden rounded-[14px] border border-border bg-card/70"
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-3.5 py-2">
        <span aria-hidden className="flex shrink-0 gap-[5px]">
          <span className="size-[5px] rounded-full bg-muted-foreground/30" />
          <span className="size-[5px] rounded-full bg-muted-foreground/30" />
          <span className="size-[5px] rounded-full bg-muted-foreground/30" />
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-background/70 px-2.5 py-1">
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", hue(active).dot)} />
          <span className="truncate font-mono text-[11px] text-muted-foreground">{active}</span>
        </span>
        {/* Balances the dot trio so the address pill centres true. */}
        <span aria-hidden className="w-[25px] shrink-0" />
      </div>
      <div key={active} className="dw-enter h-[120px] px-4 py-3.5" aria-hidden>
        <WindowBody active={active} />
      </div>
    </div>
  );
}

/**
 * The instrument itself: the constant on paper, its address, the lever, and
 * where the code points right now. Exported as `RetargetPlate` because
 * `/features/dynamic-codes` composes the same demonstration in its S2 slot
 * ("Retarget it yourself, right here") but brings its own page-depth copy,
 * so it wants this without the landing's four flanking claims.
 */
function StageInner() {
  const [active, setActive] = useState<DestinationLabel>(DESTINATIONS[0]);
  const [count, setCount] = useState(0);
  // takenOver is permanent for the component's life: the first chip click
  // ends attract mode and the effect below never re-arms it.
  const [takenOver, setTakenOver] = useState(false);
  const [attract, setAttract] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* The attract loop (D13): the demo runs itself until touched. Gated three
     ways - reduced motion never starts it (watched in BOTH directions, the
     03 rule), it only ticks while the plate is actually in view, and the
     first visitor interaction tears it down for good. SSR renders
     data-attract="off"; the effect flips it on after hydration, so the
     attribute is also an honest "is the machine driving" signal for e2e. */
  useEffect(() => {
    if (takenOver) return;
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let inView = false;
    let timer: number | null = null;

    const sync = () => {
      const want = media.matches && inView;
      if (want && timer === null) {
        timer = window.setInterval(() => {
          setActive(
            (cur) => DESTINATIONS[(DESTINATIONS.indexOf(cur) + 1) % DESTINATIONS.length],
          );
        }, ATTRACT_MS);
        setAttract(true);
      } else if (!want && timer !== null) {
        window.clearInterval(timer);
        timer = null;
        setAttract(false);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        sync();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    media.addEventListener("change", sync);
    return () => {
      io.disconnect();
      media.removeEventListener("change", sync);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [takenOver]);

  function pick(label: DestinationLabel) {
    // First touch takes the keys permanently (flipping takenOver reruns the
    // effect above, whose cleanup clears the interval).
    setTakenOver(true);
    setAttract(false);
    // Clicking the destination the code already points at is honestly not a
    // retarget, so it neither swaps nor counts.
    if (label === active) return;
    setActive(label);
    setCount((n) => n + 1);
  }

  return (
    <div
      ref={rootRef}
      data-attract={attract ? "on" : "off"}
      className="lit-stroke rounded-[22px] bg-white/[0.055] px-7 py-7"
    >
      <PrintCodeDefs codes={[PRINT_CODE]} />

      <div className="flex flex-col items-center gap-3">
        <PrintMat code={PRINT_CODE} size={184} radius={18} depth="raised" />
        <span className="font-mono text-[13px] text-foreground">{CODE_SLUG}</span>
      </div>

      {/* The routing graphic: one trunk out of the code, three branches down.
          Purely decorative - the chips beneath are the real controls - so it
          is aria-hidden and never a tab stop. */}
      <svg
        aria-hidden
        viewBox={`0 0 ${BRANCH_VIEW.w} ${BRANCH_VIEW.h}`}
        preserveAspectRatio="none"
        className="mt-3 block h-[84px] w-full overflow-visible"
      >
        {DESTINATIONS.map((label, i) => {
          const on = active === label;
          return (
            <path
              key={label}
              d={branchPath(BRANCH_X[i])}
              fill="none"
              strokeWidth={on ? 2 : 1.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={cn(
                "transition-[stroke,opacity] duration-(--duration-normal) ease-(--motion-ease-out)",
                on
                  ? cn(HUE_CLASSES[DESTINATION_HUES[label]].stroke, "opacity-100")
                  : "stroke-border opacity-60",
              )}
            />
          );
        })}
      </svg>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {DESTINATIONS.map((label) => {
          const on = active === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => pick(label)}
              aria-pressed={on}
              aria-label={`Point the code at ${label}`}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-[10px] border px-2 py-2.5 font-mono text-[12px] transition-colors duration-(--duration-normal) ease-(--motion-ease-out) focus-visible:outline-2 focus-visible:outline-offset-2",
                on
                  ? "text-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
              // Inline srgb color-mix, not Tailwind's opacity modifiers: iOS
              // Safari mis-renders their oklab mix (destination-hues.ts's
              // HUE_TINT doc comment carries the full finding).
              style={on ? { backgroundColor: tint(label).soft, borderColor: tint(label).strong } : undefined}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  on ? hue(label).dot : "bg-muted-foreground/40",
                )}
              />
              {destPath(label)}
            </button>
          );
        })}
      </div>

      <DestinationWindow active={active} />

      {/* The counter is the guarantee, proven rather than asserted: the
          visitor drives the left number and the right one never moves. The
          attract loop's own retargets are deliberately NOT in it. */}
      <div className="mt-5 flex flex-col items-center border-t border-border pt-4">
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-[11px] text-muted-foreground"
        >
          <span className="text-foreground">
            {count} retarget{count === 1 ? "" : "s"}
          </span>{" "}
          · 0 reprints · 302 · no-store
        </p>
      </div>
    </div>
  );
}

export function RetargetPlate() {
  return (
    <div className="mx-auto w-full max-w-[28rem]">
      <StageInner />
    </div>
  );
}

export function RetargetStage() {
  const left = FEATURES.filter((f) => f.side === "l");
  const right = FEATURES.filter((f) => f.side === "r");

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_28rem_minmax(0,1fr)] lg:gap-14">
      {/* The visual leads on small screens: reading two feature columns before
          seeing the thing they describe is backwards, and at one column the
          left/right split has no meaning anyway. */}
      <div className="order-2 flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-10 lg:order-none lg:flex lg:gap-14">
        {left.map((f) => (
          <Feature key={f.name} {...f} />
        ))}
      </div>

      {/* The middle track is pinned rather than `auto`: an auto track sizes to
          CONTENT, so the plate's own max-width never applied and it kept
          collapsing to whatever the chips happened to measure. 26rem -> 28rem
          at D13 for the destination window's measure. */}
      <div className="order-1 mx-auto w-full max-w-[28rem] lg:order-none">
        <StageInner />
      </div>

      <div className="order-3 flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-10 lg:order-none lg:flex lg:gap-14">
        {right.map((f) => (
          <Feature key={f.name} {...f} />
        ))}
      </div>
    </div>
  );
}
