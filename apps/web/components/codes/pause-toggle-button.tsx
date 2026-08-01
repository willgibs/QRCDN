"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { toggleCodePausedAction } from "@/app/(app)/codes/actions";

/**
 * `/codes` overview table row's Pause/Resume control (P9.5-T7). A small
 * client leaf mounted inside the server-rendered `CodesTable`
 * (components/codes/codes-table.tsx) — same "island inside an otherwise
 * server-rendered tree" shape `components/marketing/copy-button.tsx` already
 * establishes inside `CodeBlock`.
 *
 * `useActionState`, not a plain `<form action={fn.bind(...)}>`: both invoke
 * the bound `toggleCodePausedAction` correctly, but only `useActionState`
 * actually applies the fresh RSC payload the action's `refresh()` call
 * produces to this component's own DOM — see app/(app)/codes/actions.ts's
 * doc comment for the full two-part finding (a plain form never applied the
 * refresh at all; `useActionState` applied it once but not on a second
 * submission from the same mounted instance, fixed by the caller
 * (codes-table.tsx) mounting this component with `key={code.status}` so a
 * status change forces a real remount rather than reusing the instance).
 * Both parts confirmed live via the e2e suite, not assumed from docs. The
 * returned `state` (always `null`) is intentionally unused — this control
 * cares about triggering the mutation and the pending flag, not about
 * tracking any client-side state of its own; the row's real "state" is
 * always the fresh server data `refresh()` pulls back in, and the `key`
 * remount is what makes that reliably reach the DOM every time, not just
 * the first.
 */
export function PauseToggleButton({ id, paused }: { id: string; paused: boolean }) {
  const [, formAction, isPending] = useActionState(toggleCodePausedAction.bind(null, id, !paused), null);
  return (
    <form action={formAction}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        className="h-auto p-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
      >
        {paused ? "Resume" : "Pause"}
      </Button>
    </form>
  );
}
