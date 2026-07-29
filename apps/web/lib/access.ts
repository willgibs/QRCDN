// Pure access-state helpers, shared by every surface that labels a code's
// state. No imports, no directive — safely importable from server components,
// client components, and tests alike.
//
// Why this exists: `qr_codes.status` ("active" | "paused" | "archived") is NOT
// the whole truth about whether a code reaches its destination. An expiry
// (qr_codes.expires_at, P7.5) makes a code serve the unavailable page while
// its status column still reads "active" — so any UI labeling state from
// `status` alone will tell the user a code is Active when scans are actually
// landing on /u. Found by red-teaming the Studio: a code with a past expiry
// displayed "Active" in both the studio rail and the /codes table.
//
// Display order mirrors the Worker's own decision order
// (workers/redirect/src/redirect-decision.ts): archived, then paused, then
// expired. Paused outranks expired because it's the owner's explicit action
// and the Worker checks it first.

export type CodeState = "active" | "paused" | "archived" | "expired";

/** True when `expiresAt` is set and already in the past. */
export function isCodeExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) {
    return false;
  }
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) {
    return false;
  }
  return now >= at;
}

/** The state a code should be LABELED with — status plus expiry, so an expired
 *  code never renders as "Active". */
export function codeState(
  status: string,
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): CodeState {
  if (status === "archived") {
    return "archived";
  }
  if (status === "paused") {
    return "paused";
  }
  if (isCodeExpired(expiresAt, now)) {
    return "expired";
  }
  return "active";
}
