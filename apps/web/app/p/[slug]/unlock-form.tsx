"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyCodeAccess } from "./actions";

const GENERIC_ERROR = "That didn't work — try again.";
const WRONG_PASSWORD_ERROR = "Wrong password — try again.";
// P8-U4: verifyCodeAccess can now return a distinct `rate_limited` error
// (apps/web/app/p/[slug]/actions.ts, P_UNLOCK_LIMIT) — surfaced here rather
// than left to fall through to GENERIC_ERROR, same reasoning
// components/studio/code-access-dialog.tsx's ERROR_COPY map exists for: a
// generic "try again" is actively misleading for a non-transient failure
// (retrying immediately can only fail again). Not one of this unit's
// explicitly-named UI error-copy spots (those are all Studio components);
// called out as a deviation in the delivery report — verifyCodeAccess's
// only consumer is this file, so leaving its new error code unhandled here
// would ship the exact class of bug this codebase has already found and
// fixed once.
const RATE_LIMITED_ERROR = "Too many attempts — try again in a few minutes.";

function errorMessage(error: string): string {
  if (error === "incorrect") return WRONG_PASSWORD_ERROR;
  if (error === "rate_limited") return RATE_LIMITED_ERROR;
  return GENERIC_ERROR;
}

/**
 * Client half of `/p/[slug]` (P7.5-U2) — page.tsx stays a Server Component
 * (it needs `createAdminClient()`, which must never reach the client
 * bundle), so the interactive form is split out here. Not separately named
 * in this unit's file list; called out as a deviation in the delivery
 * report — Next's server/client split leaves no way to give page.tsx an
 * onSubmit handler without a colocated client subcomponent.
 *
 * On a correct password, navigates via `window.location.assign` (a full
 * navigation, not client-side routing) — the destination is an arbitrary
 * external URL, not a route in this app.
 */
export function UnlockForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy || password.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyCodeAccess(slug, password);
      if (!result.ok) {
        setError(errorMessage(result.error));
        setBusy(false);
        return;
      }
      // Full navigation on purpose — the destination is an external URL the
      // app doesn't own, not a route this router can navigate to.
      window.location.assign(result.data.destination);
      // Deliberately NOT resetting `busy` here — the button should stay in
      // its busy state through the outgoing navigation rather than flash
      // back to idle for the instant before the browser actually leaves.
    } catch {
      setError(GENERIC_ERROR);
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex w-full flex-col gap-3"
    >
      <Input
        autoFocus
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        aria-label="Password"
        disabled={busy}
        autoComplete="off"
        className="text-center"
      />
      <Button type="submit" className="w-full" disabled={busy || password.length === 0}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Continue"}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
