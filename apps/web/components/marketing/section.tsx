import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow, Reveal } from "@/components/brand/magic";

/**
 * The landing's future section primitive (P9.5-T1b) — built against the
 * fluid spacing/container/type tokens in `globals.css`. Lands here unused
 * by the landing itself (migrating the existing sections onto it is T3a's
 * job, a separate reviewed chunk); its one consumer this unit is the
 * `/developers` pilot.
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
 *   enforces its own half of this (never a hairline); everything else is
 *   a per-call-site judgment, not automatic (same reason as the centered
 *   count above).
 */

type SectionVariant = "stack" | "split" | "centered" | "showcase" | "band";
type SectionRhythm = "tight" | "standard" | "air";
type SectionSurface = "default" | "tint" | "floor";
type SectionDivider = "hairline" | "fade" | "none";

const RHYTHM_PADDING: Record<SectionRhythm, string> = {
  tight: "py-section-tight",
  standard: "py-section",
  air: "py-section-air",
};

const SURFACE_CLASS: Record<SectionSurface, string> = {
  default: "",
  tint: "bg-surface-tint",
  floor: "bg-surface-studio",
};

export function Section({
  id,
  variant = "stack",
  rhythm = "standard",
  surface = "default",
  divider = "hairline",
  className,
  children,
}: {
  id?: string;
  variant?: SectionVariant;
  rhythm?: SectionRhythm;
  surface?: SectionSurface;
  divider?: SectionDivider;
  className?: string;
  children: ReactNode;
}) {
  // band renders full-bleed and is never seamed with a hairline (its
  // surface change is the separator) — enforced regardless of what the
  // caller passes, per the rule above.
  const effectiveDivider = variant === "band" ? "none" : divider;

  return (
    <section
      id={id}
      data-slot="section"
      data-variant={variant}
      data-surface={surface}
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
      <div className={cn("mx-auto w-full max-w-page px-gutter", RHYTHM_PADDING[rhythm])}>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  lede,
  aside,
  actions,
  titleAs = "h2",
  reveal = true,
  className,
}: {
  eyebrow?: ReactNode;
  index?: string;
  title: ReactNode;
  lede?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  /** Semantic tag AND size: "h1" is `text-display`, reserved for genuine
   *  page-title contexts (there should be exactly one per page). Default
   *  "h2" renders at `text-h2`. */
  titleAs?: "h1" | "h2";
  /** Reveal-wraps the whole heading on scroll into view. Set false inside
   *  something already handling its own entrance (e.g. a tab panel). */
  reveal?: boolean;
  className?: string;
}) {
  const TitleTag = titleAs;
  const body = (
    <div
      data-slot="section-heading"
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div data-slot="section-heading-main" className="flex flex-col gap-3">
        {eyebrow && <Eyebrow index={index}>{eyebrow}</Eyebrow>}
        <TitleTag
          className={cn(
            "font-display font-semibold text-foreground",
            titleAs === "h1" ? "text-display" : "text-h2",
          )}
        >
          {title}
        </TitleTag>
        {lede && (
          <p className="max-w-lede text-lede text-muted-foreground">{lede}</p>
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

  if (!reveal) return body;
  return <Reveal>{body}</Reveal>;
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
  return (
    <Reveal delay={delay} className={className}>
      {children}
    </Reveal>
  );
}
