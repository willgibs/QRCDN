"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCodePaused } from "@/app/(app)/studio/code-actions";

/**
 * `/codes` overview table row's Pause/Resume control (P9.5-T8, the FOURTH
 * mechanism this control has shipped with — see this file's git history and
 * `docs/STATUS.md`'s P9.5-T7/T8 entries for the three that came before and
 * why each was tried).
 *
 * Calls `setCodePaused` directly (`app/(app)/studio/code-actions.ts`) —
 * the exact same action, same `getUser()` guard, same `STUDIO_MUTATE_LIMIT`
 * gate, that the Studio rail's `CodesList` already calls this same way
 * (`components/studio/codes-list.tsx`'s `handlePauseToggle`) and that
 * money-path.spec.ts's "pauses the code"/"resumes the code" tests have
 * exercised reliably since P5. No new server code, no wrapper: this is a
 * plain imperative call from a client event handler, the same shape as
 * every other row action in this codebase. None of that changed between
 * mechanisms three and four — only what happens after the action resolves.
 *
 * **Mechanism four: `router.refresh()` (`next/navigation`), called
 * imperatively right here, after `await setCodePaused(...)` resolves.** T7
 * tried and rejected two smoother mechanisms first (a plain `<form
 * action={...}>` with `revalidatePath`/`redirect` as its follow-up, and a
 * `useActionState`-driven form) and shipped a third,
 * `window.location.reload()`, after both failed empirically — network
 * request inspection showed the mutation always landed server-side but no
 * navigation-shaped response ever reached the DOM. `router.refresh()` is a
 * different kind of mechanism from those two, not a variation on either:
 * it issues its OWN explicit request for a fresh RSC payload of the
 * current route (`/codes` is `force-dynamic`, so there's no server-side
 * route cache for it to collide with), rather than depending on a Server
 * Action's own response being applied to the DOM automatically the way the
 * form-based attempts did. That distinction is exactly why it works where
 * those two didn't.
 *
 * Tried once, timeboxed, per this unit's own instruction — and it worked
 * on the first attempt: verified with three consecutive full local e2e
 * runs (`money-path.spec.ts`, real production Supabase fixture), 16/16
 * green every time including this control's own pause-then-resume test,
 * zero flakes. Replaces the hard reload: no full document load, no flash,
 * scroll position preserved (`router.refresh()`'s own documented
 * behavior — "without losing... browser state, e.g. scroll position").
 *
 * `finally`, not `then`: the refresh (and `busy` reset) fires whether the
 * mutation succeeded or failed, same "let the real data speak" reasoning
 * every earlier mechanism already used — there is no dedicated error
 * affordance on this row-level control (unlike the Studio rail's own
 * richer UI), so a failed mutation just refreshes to the unchanged
 * (correct, honest) status instead of lying or hanging. One real
 * difference from the hard-reload version: `router.refresh()` returns
 * `void`, not a promise (confirmed against this Next version's own
 * `AppRouterInstance` type), so `setBusy(false)` runs immediately after
 * triggering it rather than after it resolves — the button re-enables
 * essentially at once, and React re-renders this row with the fresh
 * `paused` prop the moment the refreshed payload streams in, same as any
 * other `router.refresh()` consumer in the App Router.
 */
export function PauseToggleButton({ id, paused }: { id: string; paused: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await setCodePaused(id, !paused);
    } finally {
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={handleClick}
      className="h-auto gap-1 p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
    >
      {busy && <Loader2 className="size-3 animate-spin" aria-hidden />}
      {paused ? "Resume" : "Pause"}
    </Button>
  );
}
