import { describe, expect, it } from "vitest";
import {
  SWAP_INITIAL,
  swapConfigChange,
  swapSweepDone,
  swapTextureReady,
  type SwapState,
} from "./swap-machine";

describe("swap machine", () => {
  it("runs the happy path: change -> ready -> sweep -> commit", () => {
    const a = swapConfigChange(SWAP_INITIAL);
    expect(a.state).toEqual({ phase: "rasterizing", gen: 1 });
    expect(a.effects).toEqual([{ type: "rasterize", gen: 1 }]);

    const b = swapTextureReady(a.state, 1, false);
    expect(b.state.phase).toBe("sweeping");
    expect(b.effects).toEqual([{ type: "beginSweep" }]);

    const c = swapSweepDone(b.state);
    expect(c.state).toEqual({ phase: "idle", gen: 1 });
    expect(c.effects).toEqual([{ type: "commit" }]);
  });

  it("drops stale generations", () => {
    const a = swapConfigChange(SWAP_INITIAL); // gen 1 in flight
    const b = swapConfigChange(a.state); // gen 2 supersedes
    expect(b.state.gen).toBe(2);

    const stale = swapTextureReady(b.state, 1, false);
    expect(stale.state).toBe(b.state);
    expect(stale.effects).toEqual([]);

    const fresh = swapTextureReady(b.state, 2, false);
    expect(fresh.state.phase).toBe("sweeping");
  });

  it("commits the running sweep before queueing a mid-sweep change", () => {
    const sweeping: SwapState = { phase: "sweeping", gen: 3 };
    const { state, effects } = swapConfigChange(sweeping);
    expect(effects).toEqual([
      { type: "commit" },
      { type: "rasterize", gen: 4 },
    ]);
    expect(state).toEqual({ phase: "rasterizing", gen: 4 });
  });

  it("never sweeps on the instant (reduced-motion/fallback) path", () => {
    const a = swapConfigChange(SWAP_INITIAL);
    const b = swapTextureReady(a.state, 1, true);
    expect(b.state).toEqual({ phase: "idle", gen: 1 });
    expect(b.effects).toEqual([{ type: "swapInstant" }]);
  });

  it("ignores sweepDone outside sweeping and textureReady outside rasterizing", () => {
    expect(swapSweepDone(SWAP_INITIAL).effects).toEqual([]);
    const idle: SwapState = { phase: "idle", gen: 5 };
    expect(swapTextureReady(idle, 5, false).effects).toEqual([]);
  });
});
