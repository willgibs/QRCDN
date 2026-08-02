"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCodePaused } from "@/app/(app)/studio/code-actions";

/**
 * `/codes` overview table row's Pause/Resume control (P9.5-T7, third
 * mechanism this control shipped with — see this file's git history and
 * `docs/STATUS.md`'s P9.5-T7 entry for the two that were tried and
 * discarded first, both because they proved unreliable, not because of a
 * style preference).
 *
 * Calls `setCodePaused` directly (`app/(app)/studio/code-actions.ts`) —
 * the exact same action, same `getUser()` guard, same `STUDIO_MUTATE_LIMIT`
 * gate, that the Studio rail's `CodesList` already calls this same way
 * (`components/studio/codes-list.tsx`'s `handlePauseToggle`) and that
 * money-path.spec.ts's "pauses the code"/"resumes the code" tests have
 * exercised reliably since P5. No new server code, no wrapper: this is a
 * plain imperative call from a client event handler, the same shape as
 * every other row action in this codebase.
 *
 * On success (or failure — see below) this forces `window.location.reload()`
 * rather than trying to get Next's client router to apply a fresh render in
 * place. That's a deliberate downgrade from a smooth SPA-style update, made
 * after two smoother mechanisms were tried and both failed empirically:
 * neither a plain `<form action={...}>` (with `revalidatePath`, `refresh`,
 * or `redirect` — tried all three) nor a `useActionState`-driven form
 * reliably got the browser to show the change without a hard reload
 * in between. Network-request evidence for the plain-form case: after
 * clicking, exactly one POST (the form submission, carrying the
 * `next-action` header) fires and no subsequent navigation-shaped request
 * ever lands — only unrelated `next-router-prefetch` GETs for other links
 * already on the page — so whatever payload the POST's response carried
 * back was never applied to the DOM. A hard reload has no such ambiguity:
 * it is a brand-new document load, unconditionally, with no dependency on
 * any Next.js client-side caching or router-application step.
 *
 * `finally`, not `then`: reload happens whether the mutation succeeded or
 * failed, same "let the real data speak" reasoning the earlier mechanisms
 * already used — there is no dedicated error affordance on this row-level
 * control (unlike the Studio rail's own richer UI), so a failed mutation
 * just reloads to the unchanged (correct, honest) status instead of lying
 * or hanging.
 *
 * DO NOT "improve" this to `router.refresh()`. That was mechanism four,
 * tried at P9.5-T8 (commit 6eb2966) precisely because a hard reload is a
 * real feel regression: it flashes and loses scroll position. It passed
 * three consecutive full LOCAL e2e runs and then failed CI's E2E job on
 * money-path.spec.ts's pause/resume test, at the same two assertions every
 * earlier mechanism failed on. Reverted here.
 *
 * The pattern across all four attempts is the point: every mechanism that
 * depends on Next's client router applying a fresh render in place has
 * passed locally and failed in CI, while this hard reload has passed CI on
 * every SHA it has shipped on. Local green is not the bar; CI green by SHA
 * is. If someone wants the smooth version back, the prerequisite is
 * understanding WHY the router-dependent path diverges between local and
 * CI — not another mechanism swap validated only on a dev machine.
 */
export function PauseToggleButton({ id, paused }: { id: string; paused: boolean }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await setCodePaused(id, !paused);
    } finally {
      window.location.reload();
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
