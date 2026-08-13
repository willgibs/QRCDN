"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "@/lib/tilt-math";
import { stepCriticalSpring, type SpringState } from "@/lib/spring";
import { QrSlabRenderer } from "@/lib/webgl/qr-slab-renderer";
import {
  SWAP_INITIAL,
  swapConfigChange,
  swapSweepDone,
  swapTextureReady,
  type SwapState,
  type SwapTransition,
} from "@/lib/webgl/swap-machine";
import { renderPreview } from "@/lib/preview";
import { DEFAULT_KIT, kitStyle, STUDIO_PAYLOAD, type KitConfig } from "./studio-kit";
import { StudioConfigPanel } from "./studio-config-panel";
import { cn } from "@/lib/utils";

/**
 * Section 03's island (P9.10-D11): ONE code as a true 3D object — an
 * embossed WebGL slab (lib/webgl/*) that takes a real light, tilts toward
 * the cursor, drifts gently in idle, and restyles under a traveling
 * aurora-hued sweep when a dial turns. The board's brief, verbatim: "a
 * true 3D object that we can render a true light sheen on" — the CSS
 * attempt's white-on-white sheen failure is solved in the shader by
 * tone-mapping headroom, not by more white.
 *
 * Progressive enhancement, and the invariant that makes every fallback
 * path cheap: the static mat below ALWAYS renders the current config as
 * real engine SVG (renderPreview is pure, so SSR emits real bytes — the
 * studio-dials precedent). The <canvas> exists only after hydration
 * decides WebGL is wanted, so served HTML never contains it and never
 * carries opacity:0 (e2e standing invariant). No WebGL, reduced motion,
 * no JS, and a lost context all resolve to the same thing: the mat, live
 * to config changes wherever JS runs.
 *
 * The aurora census note (design-system.md): section 03's aurora member is
 * THE OBJECT LIGHT — this island — migrated at D11 from the retired dial
 * sweep. The census stays 4/13.
 */

const MAX_TILT_RAD = (10 * Math.PI) / 180;
// Idle drift: ±2.2° at incommensurate periods (9.7s / 13.3s — avoiding
// 04's 18s theatre and the hero clocks so nothing beats in sync), the
// light swinging on a 14s pendulum. This is 03's one auto-advancing
// element (motion budget: one per viewport; the D9 precedent for constant
// motion that adds dimension static can't reach).
const DRIFT_RAD = (2.2 * Math.PI) / 180;
const DRIFT_X_PERIOD_S = 9.7;
const DRIFT_Y_PERIOD_S = 13.3;
const LIGHT_PERIOD_S = 14;
const HUE_PERIOD_S = 40;
/** Hue advance per config sweep: one aurora stop, so each dial turn
 *  visibly shifts the color of the light that delivers it. */
const HUE_STEP = 0.2;
/** The sdx sweep's own duration, inherited by its successor. Linear
 *  timeline on purpose — the front's feather is shaped in the shader; an
 *  eased clock crushes it into the first fifth (the C2-R1 probe lesson). */
const SWEEP_S = 1.2;
/** PrintMat's paper-margin convention, painted into the texture. */
const TEX_MARGIN_RATIO = 0.083;
// Canvas overdraw: the renderer frames the 2-unit slab in a 2x1.42 view
// (FRAME_HALF_HEIGHT in qr-slab-renderer.ts), so the canvas extends the
// mat box by (1.42 - 1) / 2 = 21% per side — the -inset-[21%] below —
// and the slab's face lands exactly on the mat's edges.

const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

/** SVG string -> white paper texture with the 8.3% margin. The engine SVG
 *  is rendered WITH pixelSize (intrinsic dimensions) so every browser
 *  rasterizes at full resolution instead of scaling a 300x150 default —
 *  then drawn inset onto the paper canvas (lib/export.ts's Blob->Image
 *  pattern; no jsdom polyfill exists so this stays browser-only). */
function svgToPaperTexture(svg: string, size: number, margin: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d context unavailable"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      const inner = size - 2 * margin;
      ctx.drawImage(img, margin, margin, inner, inner);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg rasterization failed"));
    };
    img.src = url;
  });
}

export function StudioObject() {
  const [kit, setKit] = useState<KitConfig>(DEFAULT_KIT);
  /** Canvas is in the tree (post-hydration, motion allowed). */
  const [glWanted, setGlWanted] = useState(false);
  /** First textured frame has drawn: canvas fades in, data-gl flips. */
  const [live, setLive] = useState(false);
  /** Mat hides only after the canvas fade lands, so there is no blink. */
  const [matHidden, setMatHidden] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kitRef = useRef(kit);
  const pointerRef = useRef({ x: 0, y: 0 });
  /** Imperative bridge into the GL effect; null whenever GL is inactive. */
  const glOpsRef = useRef<{ configChange: () => void } | null>(null);

  // The always-config-current fallback mat: real engine bytes at SSR.
  const matSvg = useMemo(() => renderPreview(STUDIO_PAYLOAD, kitStyle(kit)).svg, [kit]);

  function applyConfig(partial: Partial<KitConfig>): void {
    const next = { ...kitRef.current, ...partial };
    kitRef.current = next;
    setKit(next);
    glOpsRef.current?.configChange();
  }

  // Mount gate: WebGL is wanted only when motion is allowed, and the wish
  // tracks the media query live (macOS can flip it mid-session).
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MQ);
    const update = (): void => setGlWanted(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // The GL lifetime. Everything imperative lives in this one closure:
  // renderer, rAF loop, springs, swap machine, observers. Cleanup is the
  // full teardown, so flipping `glWanted` off (reduced motion arriving)
  // reverts the island to the static mat wholesale.
  useEffect(() => {
    if (!glWanted) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const renderer = new QrSlabRenderer(canvas);
    let ok = false;
    try {
      ok = renderer.init();
    } catch {
      ok = false; // driver quirk mid-init: the mat simply stays
    }
    if (!ok) return;

    let disposed = false;
    let raf: number | null = null;
    let matTimer: ReturnType<typeof setTimeout> | null = null;
    let visible = false;
    let contextLost = false;
    let textured = false;
    let liveNotified = false;
    let machine: SwapState = SWAP_INITIAL;
    let sweepStart: number | null = null;
    let hueOffset = 0;
    let springX: SpringState = { x: 0, v: 0 };
    let springY: SpringState = { x: 0, v: 0 };
    const clock = { last: 0, t: 0 };

    const step = (now: number): void => {
      raf = null;
      if (disposed || contextLost) return;
      // dt clamp: a tab-return or IO re-entry must not teleport springs
      // or fast-forward the drift.
      const dt = clock.last === 0 ? 0.016 : Math.min((now - clock.last) / 1000, 0.033);
      clock.last = now;
      clock.t += dt;

      springX = stepCriticalSpring(springX, pointerRef.current.y, dt);
      springY = stepCriticalSpring(springY, pointerRef.current.x, dt);

      let swap = 1;
      let sweepBoost = 0;
      let sweepHue = 0;
      let sweepFinished = false;
      if (sweepStart !== null) {
        const p = clamp((clock.t - sweepStart) / SWEEP_S, 0, 1);
        swap = p;
        sweepBoost = Math.sin(Math.PI * p);
        sweepHue = HUE_STEP * p;
        sweepFinished = p >= 1;
      }

      const tau = Math.PI * 2;
      renderer.frame({
        rotX: clamp(springX.x, -1, 1) * MAX_TILT_RAD + Math.sin((clock.t * tau) / DRIFT_X_PERIOD_S) * DRIFT_RAD,
        rotY: clamp(springY.x, -1, 1) * MAX_TILT_RAD + Math.sin((clock.t * tau) / DRIFT_Y_PERIOD_S + 1.7) * DRIFT_RAD,
        lightAzimuth: 0.35 + 0.55 * Math.sin((clock.t * tau) / LIGHT_PERIOD_S),
        lightElevation: 0.5,
        hueT: clock.t / HUE_PERIOD_S + hueOffset + sweepHue,
        swap,
        sweepBoost,
      });

      // Commit AFTER the frame that rendered p = 1: this frame's hueT
      // still carries sweepHue, the commit then folds it into hueOffset —
      // dispatching before the frame would count the step twice.
      if (sweepFinished) dispatch(swapSweepDone(machine));

      if (textured && !liveNotified) {
        liveNotified = true;
        setLive(true);
        // duration-slow (500ms) + slack: hide the mat only after the
        // canvas fade has landed so the crossover never blinks.
        matTimer = setTimeout(() => setMatHidden(true), 620);
      }
      schedule();
    };

    const schedule = (): void => {
      const eligible = visible && !document.hidden && !disposed && !contextLost;
      if (eligible && raf === null) {
        raf = requestAnimationFrame(step);
      } else if (!eligible && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
        clock.last = 0; // next entry restarts the dt baseline
      }
    };

    function dispatch(tr: SwapTransition, texture?: HTMLCanvasElement): void {
      machine = tr.state;
      for (const eff of tr.effects) {
        switch (eff.type) {
          case "rasterize":
            void rasterizeKit(eff.gen);
            break;
          case "beginSweep":
            if (texture) renderer.stageTexture(texture);
            renderer.beginSweep();
            sweepStart = clock.t;
            break;
          case "swapInstant":
            if (texture) renderer.stageTexture(texture);
            renderer.swapInstant();
            break;
          case "commit":
            renderer.commit();
            sweepStart = null;
            hueOffset += HUE_STEP; // the sweep's hue advance sticks
            break;
        }
      }
    }

    async function rasterizeKit(gen: number): Promise<void> {
      try {
        const texture = await rasterCurrentKit();
        if (disposed || contextLost) return;
        dispatch(
          swapTextureReady(machine, gen, window.matchMedia(REDUCED_MQ).matches),
          texture,
        );
      } catch {
        machine = { phase: "idle", gen: machine.gen }; // next turn recovers
      }
    }

    async function rasterCurrentKit(): Promise<HTMLCanvasElement> {
      // POT sizes so WebGL1 mipmapping works; 2048 only where the screen
      // can use it.
      const texSize = window.devicePixelRatio >= 1.5 ? 2048 : 1024;
      const margin = Math.round(texSize * TEX_MARGIN_RATIO);
      const svg = renderPreview(
        STUDIO_PAYLOAD,
        kitStyle(kitRef.current),
        undefined,
        texSize - 2 * margin,
      ).svg;
      return svgToPaperTexture(svg, texSize, margin);
    }

    // Boot: the first texture bypasses the machine (nothing to sweep from).
    void (async () => {
      try {
        const texture = await rasterCurrentKit();
        if (disposed || contextLost) return;
        renderer.stageTexture(texture);
        renderer.swapInstant();
        textured = true;
        schedule();
      } catch {
        /* mat stays; a later dial turn retries via the machine */
      }
    })();

    glOpsRef.current = {
      configChange: () => dispatch(swapConfigChange(machine)),
    };

    // D11.2 board note: the object watches the WHOLE section, not just
    // its own stage. Offsets are measured from the STAGE center (so it
    // faces the cursor exactly when hovered) but scaled by the SECTION's
    // half-extents, so movement anywhere in the section produces
    // variation instead of saturating the clamp at the stage boundary.
    const tiltSurface: HTMLElement = stage.closest("section") ?? stage;
    const onPointerMove = (e: PointerEvent): void => {
      const surface = tiltSurface.getBoundingClientRect();
      if (surface.width <= 0 || surface.height <= 0) return;
      const st = stage.getBoundingClientRect();
      const cx = st.left + st.width / 2;
      const cy = st.top + st.height / 2;
      pointerRef.current = {
        x: clamp((e.clientX - cx) / (surface.width / 2), -1, 1),
        y: clamp((e.clientY - cy) / (surface.height / 2), -1, 1),
      };
    };
    const resetPointer = (): void => {
      pointerRef.current = { x: 0, y: 0 };
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (e.pointerType !== "mouse") resetPointer();
    };
    tiltSurface.addEventListener("pointermove", onPointerMove);
    tiltSurface.addEventListener("pointerleave", resetPointer);
    tiltSurface.addEventListener("pointercancel", resetPointer);
    tiltSurface.addEventListener("pointerup", onPointerUp);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        schedule();
      },
      { rootMargin: "64px" },
    );
    io.observe(stage);
    const onVisibility = (): void => schedule();
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2));
    });
    ro.observe(canvas);

    const onLost = (e: Event): void => {
      e.preventDefault();
      contextLost = true;
      schedule();
      setLive(false);
      setMatHidden(false); // the (config-current) mat returns
    };
    const onRestored = (): void => {
      let restored = false;
      try {
        restored = renderer.init();
      } catch {
        restored = false;
      }
      if (!restored || disposed) return;
      contextLost = false;
      textured = false;
      liveNotified = false;
      machine = SWAP_INITIAL;
      sweepStart = null;
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2));
      void (async () => {
        try {
          const texture = await rasterCurrentKit();
          if (disposed || contextLost) return;
          renderer.stageTexture(texture);
          renderer.swapInstant();
          textured = true;
          schedule();
        } catch {
          /* mat stays */
        }
      })();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      disposed = true;
      glOpsRef.current = null;
      if (raf !== null) cancelAnimationFrame(raf);
      if (matTimer !== null) clearTimeout(matTimer);
      io.disconnect();
      ro.disconnect();
      tiltSurface.removeEventListener("pointermove", onPointerMove);
      tiltSurface.removeEventListener("pointerleave", resetPointer);
      tiltSurface.removeEventListener("pointercancel", resetPointer);
      tiltSurface.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      renderer.dispose();
      setLive(false);
      setMatHidden(false);
    };
  }, [glWanted]);

  return (
    // D11.1 board notes: the object anchors to a content edge and the
    // config panel became a dock overlapping the code's BOTTOM edge —
    // the overlap is a negative top margin, not absolute positioning,
    // so the layout below always reserves the dock's real height. The
    // caption retired to make the room. D11.2: the object shrank back
    // to its D11 size (the push to the edge was the point, not the
    // growth). D11.4: the section flipped — the anchor is now the LEFT
    // content edge (lg:mr-auto), the text column sits right.
    <div
      data-slot="studio-object"
      data-gl={live ? "live" : undefined}
      className="mx-auto w-full max-w-[340px] min-w-0 sm:max-w-[400px] lg:ml-0 lg:mr-auto lg:max-w-[380px]"
    >
        {/* Pointer tracking lives in the GL effect on the whole #studio
            SECTION (D11.2 board note: the object reacts to every cursor
            move in the section, not just directly over it), so the stage
            carries no handlers of its own. */}
        <div ref={stageRef} className="relative aspect-square touch-pan-y">
          {/* The floor pool grounds the object in both modes — one shadow
              source, so the static mat and the live slab sit identically. */}
          <span
            aria-hidden
            className="absolute inset-x-[8%] -bottom-[5%] h-[16%] rounded-[50%] bg-black/50 blur-xl"
          />
          <div
            data-qr
            className={cn(
              // rounded-[4.5%] matches the slab's own corner radius
              // (0.09 of a 2-unit face) so the crossfade is shape-true.
              "absolute inset-0 rounded-[4.5%] bg-white p-[8.3%] [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
              matHidden && "invisible",
            )}
            dangerouslySetInnerHTML={{ __html: matSvg }}
          />
          {glWanted && (
            <canvas
              ref={canvasRef}
              aria-hidden
              className={cn(
                // Overdraw: (1.42 - 1) / 2 per side. The explicit
                // h/w are LOAD-BEARING: a canvas is a replaced element,
                // so opposing insets alone never stretch it — it sits at
                // its intrinsic 300x150 and the slab renders offstage.
                "pointer-events-none absolute -top-[21%] -left-[21%] h-[142%] w-[142%] transition-opacity duration-(--duration-slow) ease-(--motion-ease-out)",
                live ? "opacity-100" : "opacity-0",
              )}
            />
          )}
      </div>

      <StudioConfigPanel
        value={kit}
        onChange={applyConfig}
        // The dock straddles the code's bottom edge; the overlap lands
        // on the paper margin band (8.3% + the engine quiet zone), so
        // it never covers modules. At the 380px D11.2 stage the band is
        // ~70px, so lg overlap stays at 56px (-mt-14), not 64.
        className="relative z-10 mx-auto -mt-12 w-fit lg:-mt-14"
      />
    </div>
  );
}
