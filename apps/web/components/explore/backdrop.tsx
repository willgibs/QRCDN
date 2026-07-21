/**
 * Hero atmosphere: a violet glow field plus a faint QR-module grid texture
 * that fades out radially — the module grid IS the brand motif. Pure CSS/SVG,
 * zero runtime cost, works over both light and dark backgrounds via
 * currentColor + opacity.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* accent glow behind the headline */}
      <div
        className="absolute left-1/2 top-[-14rem] h-[36rem] w-[64rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl dark:opacity-35"
        style={{
          background:
            "radial-gradient(closest-side, var(--primary) 0%, transparent 70%)",
        }}
      />
      {/* faint module grid, tightly masked behind the hero's heart — at higher
          opacities or looser masks this reads as a noisy checkerboard band */}
      <svg
        className="absolute inset-x-0 top-0 h-[40rem] w-full text-foreground opacity-[0.025] [mask-image:radial-gradient(ellipse_45%_38%_at_50%_42%,black,transparent)] dark:opacity-[0.035]"
        aria-hidden
      >
        <defs>
          <pattern id="qr-grid" width="96" height="96" patternUnits="userSpaceOnUse">
            {/* sparse, deterministic module cluster — echoes a QR corner */}
            <rect x="8" y="8" width="6" height="6" fill="currentColor" />
            <rect x="20" y="8" width="6" height="6" fill="currentColor" opacity="0.6" />
            <rect x="8" y="20" width="6" height="6" fill="currentColor" opacity="0.6" />
            <rect x="44" y="14" width="6" height="6" fill="currentColor" opacity="0.5" />
            <rect x="68" y="8" width="6" height="6" fill="currentColor" opacity="0.7" />
            <rect x="80" y="26" width="6" height="6" fill="currentColor" opacity="0.4" />
            <rect x="32" y="38" width="6" height="6" fill="currentColor" opacity="0.55" />
            <rect x="56" y="44" width="6" height="6" fill="currentColor" opacity="0.7" />
            <rect x="14" y="56" width="6" height="6" fill="currentColor" opacity="0.5" />
            <rect x="74" y="62" width="6" height="6" fill="currentColor" opacity="0.6" />
            <rect x="38" y="74" width="6" height="6" fill="currentColor" opacity="0.45" />
            <rect x="62" y="80" width="6" height="6" fill="currentColor" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#qr-grid)" />
      </svg>
      {/* soft floor fade so the hero settles into the page */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
