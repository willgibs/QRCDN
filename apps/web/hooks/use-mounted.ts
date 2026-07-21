"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * False during SSR and the hydration pass, true after. Use to gate
 * client-only-derived output (e.g. resolved theme) without hydration
 * mismatches or setState-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
