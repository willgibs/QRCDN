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
 */
export function LearnMoreLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      {children}
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
    </Link>
  );
}
