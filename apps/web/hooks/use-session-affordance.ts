"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useMounted } from "./use-mounted";

export type SessionAffordance = "signed-out" | "signed-in";

/**
 * `@supabase/ssr`'s browser client names its cookie `sb-<project-ref>-auth-
 * token` (chunked as `.0`, `.1`, ... past the browser's per-cookie size
 * limit) — the project ref must never be hardcoded here, since it differs
 * per environment. A match is a same-tick GUESS, not proof of a valid
 * session (the cookie could be stale or already expired) — it exists only
 * to avoid a flash of signed-out chrome for an actually-signed-in visitor
 * while the real getClaims() check below (JWT-verified) resolves.
 */
const AUTH_COOKIE_RE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

/**
 * Marketing chrome's read of sign-in state (P9.5-T0) — drives NavAuthSlot.
 * Every marketing route stays statically rendered (CLAUDE.md / p9.5-ascent.md:
 * "Marketing routes stay ○ (Static)"), so there is no server-side session
 * read available anywhere in that tree — everything here runs client-side,
 * after mount.
 *
 * Resolution order:
 * 1. `signed-out` — the default and the SSR-safe first paint (matches every
 *    visitor's first render, authed or not; see hooks/use-mounted.ts).
 * 2. The cookie-presence fast path above, checked the instant `useMounted()`
 *    flips true — synchronous, no network round trip, just avoids the flash
 *    for the common case where it's actually signed in.
 * 3. `getClaims()` (D9 / CLAUDE.md hard rule: getClaims() for identity
 *    checks, never getSession()) as the authoritative source — this can
 *    downgrade a wrong fast-path guess back to signed-out.
 * 4. An `onAuthStateChange` subscription keeps this live across sign-in/
 *    sign-out/token-refresh for as long as the component stays mounted;
 *    unsubscribed on unmount.
 */
export function useSessionAffordance(): SessionAffordance {
  const mounted = useMounted();
  const [state, setState] = useState<SessionAffordance>("signed-out");

  useEffect(() => {
    if (!mounted) return;

    // Deferred via queueMicrotask, not called directly here: a setState call
    // synchronously inside an effect's own body trips
    // react-hooks/set-state-in-effect (same rule, same fix, as
    // components/auth/login-form.tsx's Turnstile effect) — the .then()/
    // onAuthStateChange callbacks below don't need it, since those already
    // run asynchronously, never synchronously within this effect's body.
    if (AUTH_COOKIE_RE.test(document.cookie)) {
      queueMicrotask(() => setState("signed-in"));
    }

    const supabase = createClient();
    let active = true;

    supabase.auth.getClaims().then(({ data }) => {
      if (!active) return;
      setState(data?.claims ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(session ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [mounted]);

  return state;
}
