import type { ComponentProps, ReactNode } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

/**
 * 01 — Highlights (P9.7-V2, new). A bento of the five pillars, sitting between
 * the hero and the deep sections.
 *
 * It replaces the hero's `PillarStrip`, which listed five near-identical
 * labels as bare mono chips immediately above this section. Two five-item
 * feature lists inside one screen is redundancy, and of the two the strip was
 * the one carrying no information: a word and an anchor. Each card here does
 * the strip's navigation job AND says what the thing actually is.
 *
 * Deliberately NOT a uniform 5-up grid. A bento earns its name by weighting:
 * the studio and analytics cards get the wide slots because they are the two
 * pillars with the strongest demonstrations further down the page, and the API
 * takes a full-width band because a single line of request/response is a
 * naturally horizontal object.
 *
 * Every card's visual is CSS or inline SVG, no QR engine call. That is a size
 * decision, not laziness: the deep sections below already render real codes,
 * and five more engine renders up here would add weight to the top of the page
 * to say something the sections themselves say better. The bento orients; it
 * does not demonstrate.
 *
 * Zero client JS. The API request count is read from `entitlements.ts` rather
 * than retyped (CLAUDE.md hard rule).
 */

type Card = {
  href: string;
  label: string;
  claim: string;
  proof: string;
  span: string;
  /** Lays the claim and the art side by side instead of stacked. Only the
   *  full-width band uses it: 12 columns holding one stacked sentence reads
   *  as a card that ran out of things to say. */
  wide?: boolean;
  art: ReactNode;
};

/** Small caps mono label used inside each card's art. */
function Tick({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] text-muted-foreground", className)}>{children}</span>
  );
}

/** 01 studio: the kit's three decisions, as the controls themselves. */
function StudioArt() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-qr-bg px-2.5 py-2 ring-1 ring-border">
        {["#131316", "#312e81", "#1e3a8a", "#0f766e", "#b91c1c"].map((hex) => (
          <span
            key={hex}
            aria-hidden
            className="size-6 rounded-[7px]"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {["rounded-[2px]", "rounded-[5px]", "rounded-full"].map((shape, i) => (
          <span
            key={shape}
            aria-hidden
            className={cn(
              "grid size-7 place-items-center rounded-lg border",
              i === 1 ? "border-primary" : "border-border",
            )}
          >
            <span className={cn("size-3 bg-muted-foreground", shape)} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** 02 brand system: one module pattern, repeated across three surfaces. */
function KitArt() {
  return (
    <div className="flex items-end gap-2.5">
      {[
        { w: "w-12", h: "h-16", r: "rounded-[4px]" },
        { w: "w-12", h: "h-12", r: "rounded-full" },
        { w: "w-11", h: "h-14", r: "rounded-[3px]" },
      ].map((s, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "grid place-items-center border border-border bg-qr-bg",
            s.w,
            s.h,
            s.r,
          )}
        >
          <svg viewBox="0 0 7 7" className="size-5 text-qr-fg" aria-hidden>
            <path
              d="M0 0h3v3H0zM4 0h3v3H4zM0 4h3v3H0zM4 4h1v1H4zM6 4h1v1H6zM4 6h1v1H4zM6 6h1v1H6z"
              fill="currentColor"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** 03 dynamic links: the address stays, the destination moves. */
function RetargetArt() {
  return (
    <div className="flex flex-col gap-1.5 font-mono text-[11px]">
      <span className="text-muted-foreground/65 line-through decoration-1">yourcafe.com/menu</span>
      <span className="flex items-center gap-2 text-foreground">
        <span aria-hidden className="size-[5px] rounded-full bg-primary" />
        yourcafe.com/winter
      </span>
    </div>
  );
}

/** 04 analytics: scans as discrete events, which is what they are. */
function ScanArt() {
  // Fixed, authored heights. Never Math.random(): a server component would
  // bake one roll into the HTML forever, and the shape should be a decision.
  const bars = [3, 4, 3, 5, 4, 6, 5, 7, 6, 9, 12, 16, 21, 17, 12, 9, 7, 6, 5, 4];
  return (
    <div className="flex h-14 items-end gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-[1px]", i >= 9 && i <= 14 ? "bg-primary" : "bg-foreground/25")}
          style={{ height: `${(h / 21) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** 05 api: one call, and what comes back. */
function ApiArt() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px]">
      <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">POST</span>
      <span className="text-foreground">/v1/codes</span>
      <span aria-hidden className="h-px w-6 bg-border" />
      <span className="rounded-md border border-border px-2 py-1 text-muted-foreground">
        201 created
      </span>
    </div>
  );
}

const CARDS: readonly Card[] = [
  {
    href: "#studio",
    label: "Design studio",
    claim: "Set your ink, shapes and logo once.",
    proof: "live scannability instrument",
    span: "md:col-span-7",
    art: <StudioArt />,
  },
  {
    href: "#brand-system",
    label: "Brand system",
    claim: "Every code you make starts from that kit.",
    proof: "one kit, every code",
    span: "md:col-span-5",
    art: <KitArt />,
  },
  {
    href: "#dynamic-codes",
    label: "Dynamic links",
    claim: "Change where a printed code points, in seconds.",
    proof: "302 + no-store, never 301",
    span: "md:col-span-5",
    art: <RetargetArt />,
  },
  {
    href: "#analytics",
    label: "Scan analytics",
    claim: "See every scan by day, place and device.",
    proof: "raw IPs never stored",
    span: "md:col-span-7",
    art: <ScanArt />,
  },
  {
    href: "#api",
    label: "Developer API",
    claim: "Create, retarget and measure over HTTP.",
    proof: `${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString("en-US")} requests a month on Pro`,
    span: "md:col-span-12",
    wide: true,
    art: <ApiArt />,
  },
];

export function HighlightsSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section variant="stack" surface="tint" divider="none">
      <SectionHeading
        eyebrow="Highlights"
        index={index}
        title="Everything you need in one place"
        lede="Five pieces, one platform: design the code, mint it from a kit, repoint it after it prints, measure what it does, and drive all of it over an API."
        titleSize={titleSize}
        className="mb-10"
      />

      <SectionBody>
        {/* minmax(0,...) via grid-cols-12: a bare 1fr track refuses to shrink
            below its content, which is what produced 116px of horizontal
            overflow on /codes/[slug] in an earlier round. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {CARDS.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className={cn(
                "group flex min-w-0 flex-col justify-between gap-6 rounded-2xl border border-border bg-card/50 p-5 transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2 md:p-6",
                card.wide && "md:flex-row md:items-center md:gap-10",
                card.span,
              )}
            >
              <div className="flex min-w-0 flex-col gap-2">
                <span className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  {card.label}
                </span>
                <span className="text-[1.0625rem] leading-snug font-medium text-balance text-foreground">
                  {card.claim}
                </span>
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-col gap-4",
                  card.wide && "md:items-end md:gap-3",
                )}
              >
                {card.art}
                <Tick>{card.proof}</Tick>
              </div>
            </a>
          ))}
        </div>
      </SectionBody>
    </Section>
  );
}
