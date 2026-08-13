"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { definePrintCode, PrintCodeDefs, PrintMat } from "@/components/marketing/print-mat";
import { DESTINATION_HUES, HUE_CLASSES, HUE_TINT, type DestinationLabel } from "./destination-hues";
import { cn } from "@/lib/utils";

/**
 * 05's body (P9.10-D5, second-passed at P9.10-D13, recut at D13.1 on board
 * notes), replacing the `RetargetTheatre`.
 *
 * Board redirect at the D5 R1 review, and the whole shape of this file: the
 * reference the board attached (GitBook's enterprise section) earns its
 * space by keeping ONE upgraded visual CENTERED with real content arranged
 * around it — four claims this section used to compress into 11px mono
 * strips, given room to be read.
 *
 * P9.10-D13 (THE LIVE SWITCHBOARD) kept that composition and brought the
 * plate's interior to the second-pass bar; D13.1 executed the board's
 * review notes on it:
 *
 * 1. THE ATTRACT LOOP survives as shipped: the demo runs itself until
 *    touched. Every four seconds the plate retargets to the next
 *    destination, and the first chip click cancels the loop permanently -
 *    the visitor has the keys from then on.
 * 2. THE CONNECT PULSE (D13.1, board: "like our section 4 pulse... a pulse
 *    that holds the connection, then a quick drop for the next new
 *    connection? also play on clicks") replaced the browser-pane window as
 *    the retarget's payoff. The branch bases are 04's dotted-spoke idiom
 *    (potential routes); the active branch is a solid draw-in in the
 *    destination's own hue - the pulse head travels code -> chip and the
 *    lit line HOLDS behind it, the connection established. The overlay is
 *    keyed by destination, so the pulse replays on every retarget, attract
 *    tick or click alike, and the old connection drops the instant the new
 *    one departs. `pathLength=100` on the overlay normalizes one keyframe
 *    set across all three branch lengths (the 04 answer).
 * 3. The plate's container is 04's sandbox material (D13.1, board: "match
 *    section 4"): rounded-3xl, border-border/60, bg-card/25, the 24px
 *    border-token dot lattice with the ellipse mask fade. The lit-stroke
 *    card retired here (ration-friendly: a demo plate is neither touchable
 *    chrome nor an instrument panel).
 * 4. The retarget counter and the destination window retired (D13.1).
 *    Their facts did not: 302 + no-store is "Never cached", the D14
 *    unlimited policy is "Retarget anytime" - both flanking claims, both
 *    e2e-pinned. The demonstration is now the connection itself.
 *
 * The constant is a real printed code carrying a real short address, the
 * SAME code 01's repoint card moves from /menu to /winter. The routing
 * graphic survived all three rebuilds (board, D5: "I do hate we're losing
 * the cool routing graphic"); it descends because a branch that splits
 * DOWNWARD suits a portrait plate.
 *
 * Client island on purpose. The board's standing note: "don't want us to
 * build a lesser feature because we're scared of a little bit of
 * JavaScript." Still no motion library - plain state, one interval, and
 * stylesheet keyframes.
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

/** The three share one host, so the chips print only what actually differs.
 *  Full labels measured 152-160px each and wrapped 2+1, which is what
 *  pushed an earlier draft into a stacked list with nothing to branch to. */
const DEST_HOST = "yourcafe.com";
const destPath = (label: DestinationLabel) => label.slice(DEST_HOST.length);

/* The branch. One trunk leaves the code and splits three ways; the endpoints
   sit at 1/6, 3/6 and 5/6 of the width so they land on the centres of a
   three-column chip grid at any plate width. D13.1 deepened it 84 -> 104px:
   with the window retired the pulse is the star, and the run is its stage.
   Paths are authored CODE -> CHIP - the direction is load-bearing for the
   draw-in (the connection must establish outward from the constant). */
const BRANCH_VIEW = { w: 300, h: 104 };
const BRANCH_X = [48, 150, 252] as const;
function branchPath(x: number): string {
  if (x === 150) return `M150 0V${BRANCH_VIEW.h}`;
  return `M150 0V30C150 72 ${x} 54 ${x} ${BRANCH_VIEW.h}`;
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

/** Centre-aligned on the board's call at the D5 R2 review. Type register is
 *  the 03 feature-row family (D13.1, board: "more polished") - the same
 *  font-display/text-sm/semibold pairing 04's explainer already mirrors, so
 *  sections 03/04/05 read as one family of feature rows. */
function Feature({ icon, name, desc }: { icon: ReactNode; name: string; desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 text-center">
      <span className="lit-stroke grid size-9 place-items-center rounded-[11px] text-foreground">
        {icon}
      </span>
      <h3 className="font-display text-sm font-semibold text-balance">{name}</h3>
      <p className="max-w-[30ch] text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function hue(label: DestinationLabel) {
  return HUE_CLASSES[DESTINATION_HUES[label]];
}
function tint(label: DestinationLabel) {
  return HUE_TINT[DESTINATION_HUES[label]];
}

/**
 * The instrument itself: the constant on paper, its address, three dotted
 * routes, and one live connection. Exported as `RetargetPlate` because
 * `/features/dynamic-codes` composes the same demonstration in its S2 slot
 * ("Retarget it yourself, right here") but brings its own page-depth copy,
 * so it wants this without the landing's four flanking claims.
 */
function StageInner() {
  const [active, setActive] = useState<DestinationLabel>(DESTINATIONS[0]);
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
    // retarget, so nothing replays.
    if (label === active) return;
    setActive(label);
  }

  return (
    // The container is 04's sandbox material (D13.1 board note): same
    // border/wash/lattice as brand-system-section's frame, so the two
    // neighboring visuals read as one system. Content sits in a `relative`
    // wrapper so the absolutely-positioned lattice paints beneath it.
    <div
      ref={rootRef}
      data-attract={attract ? "on" : "off"}
      className="relative rounded-3xl border border-border/60 bg-card/25 px-7 py-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 75% 85% at 50% 50%, black 55%, transparent 100%)",
        }}
      />
      <div className="relative">
        <PrintCodeDefs codes={[PRINT_CODE]} />

        <div className="flex flex-col items-center gap-3">
          <PrintMat code={PRINT_CODE} size={184} radius={18} depth="raised" />
          <span className="font-mono text-[13px] text-foreground">{CODE_SLUG}</span>
        </div>

        {/* The routing graphic: dotted routes (04's spoke idiom - dashes in
            user px, NO pathLength, the dots stay dots at any stretch) under
            one live connection (the keyed draw-in overlay). Purely
            decorative - the chips beneath are the real controls - so it is
            aria-hidden and never a tab stop. */}
        <svg
          aria-hidden
          viewBox={`0 0 ${BRANCH_VIEW.w} ${BRANCH_VIEW.h}`}
          preserveAspectRatio="none"
          className="mt-3 block h-[104px] w-full overflow-visible"
        >
          {DESTINATIONS.map((label, i) => (
            <path
              key={label}
              d={branchPath(BRANCH_X[i])}
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="0.1 7"
              vectorEffect="non-scaling-stroke"
              className="stroke-border"
            />
          ))}
          {/* The connect pulse: mounted fresh per destination, draws
              code -> chip and holds. The previous connection is gone the
              frame this one departs - the board's "quick drop". */}
          <path
            key={active}
            d={branchPath(BRANCH_X[DESTINATIONS.indexOf(active)])}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={100}
            vectorEffect="non-scaling-stroke"
            className={cn("ds-connect", hue(active).stroke)}
          />
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
      <div className="order-2 flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-10 lg:order-none lg:flex lg:gap-12">
        {left.map((f) => (
          <Feature key={f.name} {...f} />
        ))}
      </div>

      {/* The middle track is pinned rather than `auto`: an auto track sizes to
          CONTENT, so the plate's own max-width never applied and it kept
          collapsing to whatever the chips happened to measure. 26rem -> 28rem
          at D13. */}
      <div className="order-1 mx-auto w-full max-w-[28rem] lg:order-none">
        <StageInner />
      </div>

      <div className="order-3 flex flex-col gap-10 sm:grid sm:grid-cols-2 sm:gap-x-10 lg:order-none lg:flex lg:gap-12">
        {right.map((f) => (
          <Feature key={f.name} {...f} />
        ))}
      </div>
    </div>
  );
}
