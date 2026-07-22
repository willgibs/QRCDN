"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Throttles a fast-firing callback (react-colorful's `onChange` fires on
 * every pointermove during a drag) to at most once per animation frame,
 * always delivering the *latest* value rather than a stale intermediate one
 * — plain `requestAnimationFrame`, no new dependency (P4 design-iteration
 * note 2). `renderQr` is cheap and deterministic, so per-frame is plenty;
 * this just stops a fast mouse from queuing more style updates than the
 * screen can show.
 */
export function useRafThrottledCallback<Value>(
  callback: (value: Value) => void,
): (value: Value) => void {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ value: Value } | null>(null);

  // Refs can't be written during render (react-hooks/refs) — keeping the
  // latest callback for the next rAF tick happens here instead, which runs
  // after every commit, well before a drag's next animation frame fires.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return useCallback((value: Value) => {
    pendingRef.current = { value };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingRef.current) callbackRef.current(pendingRef.current.value);
    });
  }, []);
}
