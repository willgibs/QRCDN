// Hand-drawn miniature SVG swatches for `dots.style` / `eyes.frame` picks —
// shared between the marketing exploration surface (studio-slice.tsx) and the
// real authenticated studio (P4-U2), per the design-system guide's own
// direction that this is "the pattern to follow for future studio/dashboard
// work." Pure presentational, no hooks — safe to import from either a server
// or client component tree.

export const DOT_STYLES = ["square", "rounded", "circle"] as const;
export const EYE_FRAMES = ["square", "rounded", "circle", "leaf"] as const;

export function DotSwatch({ style }: { style: (typeof DOT_STYLES)[number] }) {
  const r = style === "circle" ? 45 : style === "rounded" ? 28 : 6;
  return (
    <svg viewBox="0 0 100 100" className="size-5" aria-hidden>
      {[0, 1, 2].flatMap((y) =>
        [0, 1, 2].map((x) =>
          (x + y) % 2 === 0 ? (
            <rect
              key={`${x}${y}`}
              x={x * 34}
              y={y * 34}
              width={30}
              height={30}
              rx={(r / 100) * 30}
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export function EyeSwatch({ frame }: { frame: (typeof EYE_FRAMES)[number] }) {
  const rx = frame === "circle" ? 50 : frame === "rounded" ? 30 : frame === "leaf" ? 30 : 0;
  return (
    <svg viewBox="0 0 100 100" className="size-5" aria-hidden>
      <rect
        x={6}
        y={6}
        width={88}
        height={88}
        rx={rx === 30 ? 26 : rx === 50 ? 44 : 0}
        fill="none"
        stroke="currentColor"
        strokeWidth={13}
        {...(frame === "leaf" ? { style: { clipPath: "none" } } : {})}
      />
      <rect x={34} y={34} width={32} height={32} rx={rx === 50 ? 16 : rx === 30 ? 8 : 0} fill="currentColor" />
    </svg>
  );
}
