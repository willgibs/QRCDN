import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/brand/marks";

/**
 * The landing's section primitive (P9.5-T1b, landing-migrated at P9.5-T3a,
 * gained real system vocabulary at P9.7-U1) — built against the fluid
 * spacing/container/type tokens in `globals.css`.
 *
 * Composition rules — doc-commented here because they're layout
 * judgment calls a type signature can't enforce, not because any of this
 * is checked automatically:
 *
 * - **Dead-measure ban.** A narrow-measure heading (`SectionHeading`
 *   with no `aside`, or any `max-w-copy`/`max-w-lede` block) must not be
 *   the only thing in its row at wide viewports — pair it with an
 *   `aside`/`actions`, or follow it with a full-measure visual
 *   (`SectionBody` content, a screenshot, a chart). A narrow column
 *   floating in acres of empty horizontal space reads as broken, not
 *   restrained.
 * - **Centered ≤3 per page.** `variant="centered"` is a strong, attention
 *   -grabbing beat — more than 2-3 uses on one page reads as monotonous
 *   rather than composed. Not enforced in code (Section has no way to
 *   see its siblings); a page-composition-time rule for whoever's
 *   assembling sections (T3a).
 * - **Hairlines only between same-surface neighbors.** A `divider`
 *   belongs between two sections sharing one `surface` (the hairline IS
 *   the separator). Between two sections with *different* surfaces, the
 *   surface/color change already reads as a separator — an added
 *   hairline on top of that is a redundant, fussier seam. `variant="band"`
 *   enforces its own half of this (never a hairline); `surface="ink"`
 *   does too, for the same reason plus its own load-bearing top/bottom
 *   hairline (see `SectionSurface` below) — everything else is a
 *   per-call-site judgment, not automatic (same reason as the centered
 *   count above).
 * - **`frame` default is byte-identical (P9.7-U1).** `frame="page"` is the
 *   default and renders the exact class string every call site already
 *   got before this prop existed — adding it changed no existing output.
 *   `"wide"` is a wider fixed measure (`max-w-wide`, 88rem) for a section
 *   that wants more breathing room than the page frame but still wants a
 *   gutter; `"bleed"` drops the max-width AND the gutter entirely — a
 *   bleed section re-establishes its own inner measure at the call site,
 *   `Section` gives it none.
 * - **`variant="split"` needs an opt-in to lay out (P9.7-U1).** Passing
 *   `splitRail` lays the section's direct children out as a sticky
 *   heading-rail + body grid at `md` and up (see the CSS in `globals.css`,
 *   scoped to `[data-slot="section"][data-variant="split"][data-split="rail"]`
 *   specifically so it can never fire without both the variant AND the
 *   opt-in). Sections 03/05/07/09 already pass `variant="split"` without
 *   `splitRail` and stay exactly as they render today — plain stacked
 *   children, no grid, at every viewport. `variant="showcase"` stays
 *   inert on purpose: it exists so a section can declare intent (pairs
 *   with `frame="wide"`) without claiming a layout behavior it doesn't
 *   have yet.
 */

type SectionVariant = "stack" | "split" | "centered" | "showcase" | "band";
type SectionRhythm = "tight" | "standard" | "air";
/** `"ink"` (P9.7-U1) is the page's one inverted plate: background AND
 *  foreground flip, plus a load-bearing top/bottom hairline in
 *  `--ink-border` (not the normal `--border`, which reads as invisible
 *  against this dark plate in both site themes) — without it, an inverted
 *  surface in dark mode reads as "more page," not a hard stop. */
type SectionSurface = "default" | "tint" | "floor" | "ink";
type SectionDivider = "hairline" | "fade" | "none";
/** `"page"` (default, byte-identical to pre-P9.7-U1 markup) is today's
 *  72rem frame; `"wide"` is the 88rem `max-w-wide` frame; `"bleed"` drops
 *  both the max-width and the gutter for a caller that re-establishes its
 *  own inner measure. */
type SectionFrame = "page" | "wide" | "bleed";

const RHYTHM_PADDING: Record<SectionRhythm, string> = {
  tight: "py-section-tight",
  standard: "py-section",
  air: "py-section-air",
};

const SURFACE_CLASS: Record<SectionSurface, string> = {
  default: "",
  tint: "bg-surface-tint",
  floor: "bg-surface-studio",
  ink: "border-y border-ink-border bg-surface-ink text-ink-foreground",
};

const FRAME_CLASS: Record<SectionFrame, string> = {
  page: "mx-auto w-full max-w-page px-gutter",
  wide: "mx-auto w-full max-w-wide px-gutter",
  bleed: "w-full",
};

export function Section({
  id,
  variant = "stack",
  rhythm = "standard",
  surface = "default",
  frame = "page",
  divider = "hairline",
  splitRail = false,
  className,
  children,
}: {
  id?: string;
  variant?: SectionVariant;
  rhythm?: SectionRhythm;
  surface?: SectionSurface;
  frame?: SectionFrame;
  divider?: SectionDivider;
  /** Opt-in for `variant="split"`'s real sticky-rail grid at `md` and up
   *  (P9.7-U1) — see the file doc comment above. No effect on any other
   *  variant. */
  splitRail?: boolean;
  className?: string;
  children: ReactNode;
}) {
  // band renders full-bleed and is never seamed with a hairline (its
  // surface change is the separator) — enforced regardless of what the
  // caller passes, per the rule above. surface="ink" (P9.7-U1) joins band
  // here for the same reason: it carries its own top/bottom hairline in
  // --ink-border, so the generic --border hairline would double the seam.
  const effectiveDivider = variant === "band" || surface === "ink" ? "none" : divider;

  return (
    <section
      id={id}
      data-slot="section"
      data-variant={variant}
      data-surface={surface}
      data-split={splitRail ? "rail" : undefined}
      // scroll-mt-24 (P9.5-T3a): the pillar strip's #studio/#dynamic-codes/
      // #analytics/#api anchors are the first real in-page jump targets any
      // Section carries. SiteNav is sticky top-0 (~57px tall); without this
      // a jumped-to section's heading lands directly under the nav bar.
      // Applied unconditionally (harmless on sections with no id — nothing
      // ever scrolls to an element with no fragment pointing at it), same
      // 6rem value components/marketing/developers/section.tsx already uses
      // for its own anchor headings.
      className={cn("relative scroll-mt-24", SURFACE_CLASS[surface], className)}
    >
      {effectiveDivider === "hairline" && (
        <div aria-hidden className="border-t border-border/60" />
      )}
      {effectiveDivider === "fade" && (
        <div
          aria-hidden
          className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
      )}
      <div className={cn(FRAME_CLASS[frame], RHYTHM_PADDING[rhythm])}>{children}</div>
    </section>
  );
}

const TITLE_SIZE_CLASS: Record<"display" | "h1" | "h2-lg" | "h2" | "h3", string> = {
  display: "text-display",
  h1: "text-h1",
  "h2-lg": "text-h2-lg",
  h2: "text-h2",
  h3: "text-h3",
};

export function SectionHeading({
  eyebrow,
  index,
  title,
  lede,
  aside,
  actions,
  titleAs = "h2",
  titleSize,
  tone = "default",
  reveal = true,
  className,
}: {
  eyebrow?: ReactNode;
  index?: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  /** Semantic tag: there should be exactly one `"h1"` per page. Decoupled
   *  from visual size at P9.7-U1 — see `titleSize`. */
  titleAs?: "h1" | "h2";
  /** Visual size, independent of the semantic tag (P9.7-U1). Defaults from
   *  `titleAs` so every existing call site renders byte-identical to
   *  before this prop existed: `titleAs="h1"` -> `text-display`,
   *  `titleAs="h2"` -> `text-h2`. There must never be a second page `<h1>`:
   *  a section that wants bigger type while staying an `<h2>` sets
   *  `titleAs="h2"` with `titleSize="h1"` rather than `titleAs="h1"`.
   *  `"h2-lg"` (P9.9-C0) is the landing's Normal register between h1 and
   *  h2; the Loud/Normal/Quiet ladder for `/` is declared in
   *  `app/(marketing)/page.tsx`, the same ownership model P9.7-V1 already
   *  established for section ordinals. */
  titleSize?: "display" | "h1" | "h2-lg" | "h2" | "h3";
  /** "ink" (P9.9-C0, additive - default stays byte-identical) recolors the
   *  whole heading block for a `surface="ink"` plate: the site's
   *  foreground/muted tokens don't re-scope inside ink, so the eyebrow and
   *  lede would otherwise keep their un-inverted greys. Also sets the
   *  title's `text-ink-foreground` EXPLICITLY: without it the title only
   *  read correctly by accident (tailwind-merge treats `text-foreground`
   *  and the `text-h1` size utility as one conflict group and silently
   *  dropped the color, letting the section root's `text-ink-foreground`
   *  inherit through). Same prop shape as `MonoStrip`/`Eyebrow` `tone`. */
  tone?: "default" | "ink";
  /** Reveal-wraps the whole heading on scroll into view. Set false inside
   *  something already handling its own entrance (e.g. a tab panel). */
  reveal?: boolean;
  className?: string;
}) {
  const TitleTag = titleAs;
  const resolvedTitleSize = titleSize ?? (titleAs === "h1" ? "display" : "h2");
  const body = (
    <div
      data-slot="section-heading"
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div data-slot="section-heading-main" className="flex flex-col gap-3">
        {eyebrow && (
          <Eyebrow index={index} tone={tone}>
            {eyebrow}
          </Eyebrow>
        )}
        <TitleTag
          className={cn(
            "font-display font-semibold",
            tone === "ink" ? "text-ink-foreground" : "text-foreground",
            TITLE_SIZE_CLASS[resolvedTitleSize],
          )}
        >
          {title}
        </TitleTag>
        {lede && (
          <p
            className={cn(
              "max-w-lede text-lede",
              tone === "ink" ? "text-ink-muted" : "text-muted-foreground",
            )}
          >
            {lede}
          </p>
        )}
      </div>
      {(aside || actions) && (
        <div
          data-slot="section-heading-aside"
          className="flex shrink-0 flex-col items-start gap-3 md:items-end"
        >
          {aside}
          {actions}
        </div>
      )}
    </div>
  );

  // P9.7-U1: was `<Reveal>{body}</Reveal>` (motion/react `whileInView`,
  // which SSRs `opacity:0` on this same wrapper div — see globals.css's
  // `section-reveal` keyframes for the CSS replacement). Structurally
  // identical to what Reveal rendered here (Reveal was called with no
  // className, so its motion.div was already a bare wrapper around this
  // exact `body` div) — only the wrapper's attributes changed, style out,
  // data-reveal in.
  if (!reveal) return body;
  return <div data-reveal="true">{body}</div>;
}

export function SectionBody({
  delay = 0.1,
  reveal = true,
  className,
  children,
}: {
  delay?: number;
  reveal?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!reveal) {
    return <div className={className}>{children}</div>;
  }
  // P9.7-U1: was `<Reveal delay={delay} className={className}>` — Reveal's
  // own motion.div rendered this exact div (className passed straight
  // through, no extra nesting), so swapping it for a plain div with the
  // same className is a 1:1 replacement. `className` stays first in prop
  // order (matching where `class` sat relative to `style` in the old
  // rendered markup) so the only byte difference is the attribute itself,
  // not its position. `delay`'s stagger intent survives as a boolean
  // `data-reveal-delay` (any delay > 0 gets the same slightly-later
  // animation-range in globals.css) since CSS `animation-delay` is
  // meaningless against a scroll timeline — there's no scroll progress to
  // delay through.
  return (
    <div className={className} data-reveal="true" data-reveal-delay={delay > 0 ? "true" : undefined}>
      {children}
    </div>
  );
}
