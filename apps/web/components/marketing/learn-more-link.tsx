import Link from "next/link";

/**
 * Inline "Label →" link used for the API and pricing teaser CTAs (P9-U2).
 * Pure-CSS chevron-to-arrow hover morph — transitions.dev's "Learn more
 * hover" pattern (.agents/skills/transitions-dev/24-learn-more-hover.md),
 * re-expressed with this project's own motion tokens
 * (`--duration-fast`/`--motion-ease-out`) instead of the catalog's parallel
 * `--learn-*` variables, so it reads from the one token system the rest of
 * the app uses. `transform-box: view-box` is required (not just the arbitrary
 * `transform-origin`) — without it, an SVG child's transform-origin doesn't
 * resolve against the viewBox coordinate space in every browser, per the
 * catalog reference's own CSS. A hover-only affordance: no keyboard/touch
 * fallback needed since the link is fully usable without the motion.
 *
 * `external` (P9.5-T3c, additive — every existing call site omits it and
 * keeps today's behavior): renders a plain `<a target="_blank" rel="noopener
 * noreferrer">` instead of `next/link`'s `<Link>`, for the one off-site CTA
 * this component now serves (section 09's "View the repo" -> GitHub) —
 * same visual/motion treatment, correct new-tab semantics for leaving the
 * site entirely.
 */
export function LearnMoreLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: string;
  external?: boolean;
}) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <ChevronArrow />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
      <ChevronArrow />
    </Link>
  );
}

function ChevronArrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4 shrink-0 transition-transform duration-(--duration-fast) ease-(--motion-ease-out) group-hover:translate-x-0.5 motion-reduce:transition-none"
    >
      <path
        d="M6 4L10 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="origin-[10px_8px] transition-transform duration-(--duration-fast) ease-(--motion-ease-out) group-hover:rotate-[8deg] motion-reduce:transition-none [transform-box:view-box]"
      />
      <path
        d="M10 8L6 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="origin-[10px_8px] transition-transform duration-(--duration-fast) ease-(--motion-ease-out) group-hover:-rotate-[8deg] motion-reduce:transition-none [transform-box:view-box]"
      />
    </svg>
  );
}
