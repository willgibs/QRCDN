"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSessionAffordance } from "@/hooks/use-session-affordance";

/**
 * Session-aware nav chrome (P9.5-T0), wired into site-nav.tsx's three
 * render sites: the desktop nav-row text link, the always-visible CTA
 * button, and the mobile disclosure's stacked link. All three read the same
 * `useSessionAffordance()` state so they flip together.
 *
 * Signed-in collapses BOTH "Sign in" and "Start free" into one
 * "Open studio →" button — there's nothing left to sign in to or start
 * free. The two text-link sites (`NavAuthLink`, used for both the desktop
 * and mobile "Sign in" spots) simply render nothing when signed in; a small
 * nav link appearing/disappearing is ordinary responsive behavior, not the
 * kind of jump the CTA needs guarding against. `NavAuthCta` — the one
 * prominent, bordered button whose box visibly resizing WOULD read as a
 * jump — carries a `min-w` sized to the longer of its two labels so the
 * flip from the cookie fast-path/getClaims resolution
 * (hooks/use-session-affordance.ts) never visibly resizes it.
 */

export function NavAuthLink({
  className,
  onNavigate,
}: {
  className: string;
  onNavigate?: () => void;
}) {
  const state = useSessionAffordance();
  if (state === "signed-in") return null;

  return (
    <Link href="/login" onClick={onNavigate} className={className}>
      Sign in
    </Link>
  );
}

export function NavAuthCta() {
  const state = useSessionAffordance();
  const signedIn = state === "signed-in";

  return (
    <Button asChild size="sm" className="min-w-32">
      <Link href={signedIn ? "/studio" : "/login"}>{signedIn ? "Open studio →" : "Start free"}</Link>
    </Button>
  );
}
