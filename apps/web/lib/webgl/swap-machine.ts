// The texture-swap state machine for the studio object's config changes —
// pure, so the async-ordering rules (stale rasterizations dropped, a
// config change mid-sweep committing before it queues) are unit-testable
// without GL or timers (swap-machine.test.ts). The island owns the actual
// timing: it drives sweep progress from its rAF clock and reports
// completion via `swapSweepDone`.
//
// Phases: idle -> rasterizing (async renderQr + rasterize in flight) ->
// sweeping (the light front travels, blending uTexPrev -> uTexNext) ->
// idle. `gen` counts config changes; a texture arriving for any generation
// but the latest is stale and dropped ("latest wins" — the old dials'
// MatQr had the same rule implicitly via useMemo).

export interface SwapState {
  phase: "idle" | "rasterizing" | "sweeping";
  gen: number;
}

export type SwapEffect =
  /** Kick the async render+rasterize pipeline for this generation. */
  | { type: "rasterize"; gen: number }
  /** Renderer: bind the new texture to the NEXT unit, reset sweep to 0. */
  | { type: "beginSweep" }
  /** Renderer: bind the new texture to BOTH units, sweep pinned at 1. */
  | { type: "swapInstant" }
  /** Renderer: promote NEXT to both units, sweep pinned at 1. */
  | { type: "commit" };

export interface SwapTransition {
  state: SwapState;
  effects: SwapEffect[];
}

export const SWAP_INITIAL: SwapState = { phase: "idle", gen: 0 };

/** A dial turned. Mid-sweep the current sweep commits instantly first so
 *  the outgoing texture is never blended against two generations at once. */
export function swapConfigChange(s: SwapState): SwapTransition {
  const gen = s.gen + 1;
  const effects: SwapEffect[] =
    s.phase === "sweeping"
      ? [{ type: "commit" }, { type: "rasterize", gen }]
      : [{ type: "rasterize", gen }];
  return { state: { phase: "rasterizing", gen }, effects };
}

/** The async pipeline delivered a texture for `gen`. `instant` is the
 *  reduced-motion/fallback path: swap with no sweep. */
export function swapTextureReady(
  s: SwapState,
  gen: number,
  instant: boolean,
): SwapTransition {
  if (s.phase !== "rasterizing" || gen !== s.gen) {
    return { state: s, effects: [] }; // stale or unsolicited: drop
  }
  return instant
    ? { state: { phase: "idle", gen: s.gen }, effects: [{ type: "swapInstant" }] }
    : { state: { phase: "sweeping", gen: s.gen }, effects: [{ type: "beginSweep" }] };
}

/** The rAF clock ran the sweep to completion. */
export function swapSweepDone(s: SwapState): SwapTransition {
  if (s.phase !== "sweeping") return { state: s, effects: [] };
  return { state: { phase: "idle", gen: s.gen }, effects: [{ type: "commit" }] };
}
