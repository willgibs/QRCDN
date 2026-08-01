const PILLARS = [
  { label: "studio", href: "#studio" },
  { label: "dynamic codes", href: "#dynamic-codes" },
  { label: "analytics", href: "#analytics" },
  { label: "api", href: "#api" },
  // P9.5-T3c: switched from the external repo URL to the in-page
  // #open-source section (section 09, "Built in the open") now that it
  // exists — copy deck v3's HERO block called this switch out explicitly.
  { label: "open source", href: "#open-source" },
] as const;

/**
 * Hero pillar strip (P9.5-T3a) — five mono doorway chips closing the hero,
 * per the copy deck. Plain server component: four in-page hash anchors and
 * one external repo link are both native browser behavior, no client JS
 * needed either way.
 */
export function PillarStrip() {
  return (
    <nav aria-label="Jump to a section" className="flex flex-wrap items-center justify-center gap-2 border-t border-border/60 pt-6">
      {PILLARS.map((pillar) => {
        const external = pillar.href.startsWith("http");
        return (
          <a
            key={pillar.label}
            href={pillar.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {pillar.label}
          </a>
        );
      })}
    </nav>
  );
}
