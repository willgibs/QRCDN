/**
 * Shared page atmosphere: a soft neutral overhead wash plus THE PIXEL
 * FIELD — the brand's module texture (P9.10-D8). Seven surfaces compose
 * this (the hero, /login, /developers, /u, /p, /auth/confirm, the 404),
 * which is exactly why the field lives here: the board named the
 * pixelated grid a BRAND element, and a brand element that only the hero
 * wears is a hero decoration.
 *
 * The field replaced a repeating 96px `<pattern>` tile. A tile is
 * uniform by construction — the same twelve modules stamped forever —
 * and the board's reference boards (Mistral's and Lightdash's pixel
 * clusters) get their life from VARIATION: mixed cell sizes, mixed
 * alphas, density that pools toward the top and the corners and thins
 * to nothing. So the field is generated instead: a seeded LCG walks a
 * 12px module grid, keeps a cell with probability that decays with
 * depth and swells near the left/right edges, and deals each survivor
 * a size (one module, occasionally two) and its own alpha. Seeded, not
 * Math.random(): the markup must be byte-identical across builds and
 * between server and client, so the field is a fixed constellation,
 * not a per-render roll.
 *
 * Two guardrails:
 * - MONOCHROME, and quiet. currentColor at 0.05 element opacity with
 *   per-cell alphas under it; the aurora stays the only colour event on
 *   any surface this backs.
 * - It must never read as a scannable code. No finder rings, no quiet
 *   zone, no symbol-shaped clusters — an abstract drift of modules. The
 *   QR solidity rule bans fake CODES; this is deliberately too sparse
 *   and too structureless to be mistaken for one.
 */

const CELL = 12;
const FIELD_W = 1920;
const FIELD_H = 460;
const COLS = FIELD_W / CELL;
const ROWS = FIELD_H / CELL;

/** Deterministic LCG (numerical-recipes constants). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

const rand = lcg(0x51ed270b);

const FIELD_CELLS: { x: number; y: number; s: number; o: number }[] = [];
for (let gy = 0; gy < ROWS; gy++) {
  for (let gx = 0; gx < COLS; gx++) {
    const yT = gy / ROWS;
    const xT = gx / COLS;
    const edge = Math.min(xT, 1 - xT);
    // Density: strongest at the very top, gone by the field's foot,
    // boosted in the outer fifths so the corners cluster like the
    // reference boards without ever forming a solid block.
    const vertical = (1 - yT) ** 2.6;
    const corner = edge < 0.2 ? 1 + (0.2 - edge) * 5 : 1;
    const keep = rand();
    if (keep < 0.055 * vertical * corner) {
      const big = rand() < 0.14;
      FIELD_CELLS.push({
        x: gx * CELL,
        y: gy * CELL,
        s: big ? CELL * 2 - 2 : CELL - 2,
        o: +(0.25 + rand() * 0.75).toFixed(2),
      });
    }
  }
}

export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* overhead light behind the headline — since the D13 monochrome
          amendment --primary is near-white ink, so this is a soft neutral
          wash, not an accent: the only colour on this surface is the
          aurora, and this must stay quiet under it (P9.10-D1) */}
      <div
        className="absolute left-1/2 top-[-14rem] h-[36rem] w-[64rem] -translate-x-1/2 rounded-full opacity-[0.05] blur-3xl dark:opacity-[0.08]"
        style={{
          background:
            "radial-gradient(closest-side, var(--primary) 0%, transparent 70%)",
        }}
      />
      {/* the pixel field — the mask is a belt-and-braces fade under the
          density falloff already baked into the generation, so the field
          can never hard-stop against content lower on the page */}
      <svg
        data-slot="pixel-field"
        viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-x-0 top-0 h-[26rem] w-full text-foreground opacity-[0.05] [mask-image:linear-gradient(to_bottom,black_45%,transparent)] dark:opacity-[0.06]"
        aria-hidden
      >
        {FIELD_CELLS.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={c.s} height={c.s} fill="currentColor" opacity={c.o} />
        ))}
      </svg>
      {/* soft floor fade so the surface settles into the page */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
