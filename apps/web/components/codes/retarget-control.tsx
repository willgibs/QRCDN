"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateDestination } from "@/lib/validation";
import { retargetCode } from "@/app/(app)/studio/code-actions";
import type { DynamicCodeSummary } from "@/lib/codes-core";

const RATE_LIMITED_ROW_ERROR = "Too many changes just now. Try again in a few minutes.";
// P8-U5: retargetCode screens the new destination through Safe Browsing
// (lib/safe-browsing.ts, via retargetCodeCore).
const UNSAFE_DESTINATION_ROW_ERROR = "That destination was flagged as unsafe.";

/**
 * Maps a mutating action's server-side error code to copy a person can act
 * on, overriding whatever generic fallback the caller would otherwise show.
 * Extracted from components/studio/codes-list.tsx (P9.6-U3) — that file
 * used this same mapping for BOTH its inline retarget form and its
 * pause-toggle handler, so it's exported here (retarget's own error codes
 * live) rather than duplicated. `rate_limited` can come from any
 * `STUDIO_MUTATE_LIMIT`-gated action, not just retarget, which is why
 * `codes-list.tsx` still imports this for its pause-toggle path too.
 */
export function rowErrorMessage(error: string, fallback: string): string {
  if (error === "rate_limited") return RATE_LIMITED_ROW_ERROR;
  if (error === "destination_unsafe") return UNSAFE_DESTINATION_ROW_ERROR;
  return fallback;
}

/**
 * The retarget form itself (P9.6-U3), extracted verbatim in behavior from
 * components/studio/codes-list.tsx's previously-inline `<form>`
 * (lines 304-345 pre-extraction) so both the Studio rail and the code
 * detail page (`components/codes/code-actions-panel.tsx`) share one
 * implementation instead of two copies that can drift. Goes through the
 * existing `retargetCode` action unchanged — that action carries the KV
 * write-through path (`toKvRecord`, `lib/codes-core.ts`), untouched by this
 * unit.
 *
 * Deliberately renders ONLY the form, not a trigger button and not a
 * notice/toast: the two existing call sites want different trigger UIs (a
 * dropdown menu item vs. a plain button) and different post-outcome
 * behavior (codes-list.tsx keeps its own row-level "Propagating" toast and
 * local state patch; the detail page reloads instead — see
 * code-actions-panel.tsx's own doc comment for why). `onSuccess`/`onError`
 * bubble up every outcome so each caller can decide for itself; this
 * component owns only the input draft and its own submit-busy state.
 *
 * Mount this conditionally on the caller's own "is this open" state
 * (`{open && <RetargetControl ... />}`), same reasoning as
 * `CodeAccessDialog`'s own doc comment: the draft below initializes via a
 * `useState` initializer read from `code.destination_url` once, at mount.
 */
export function RetargetControl({
  code,
  onSuccess,
  onError,
  onCancel,
  onBusyChange,
  className,
}: {
  code: Pick<DynamicCodeSummary, "id" | "name" | "destination_url">;
  /** Fires after a successful `retargetCode` call — `kvSynced` lets the
   *  caller decide whether to surface a "Propagating (~1 min)" notice. */
  onSuccess: (id: string, destinationUrl: string, kvSynced: boolean) => void;
  onError: (message: string) => void;
  onCancel: () => void;
  /** Optional: mirrors this form's own submit-in-flight state outward.
   *  codes-list.tsx wires this to its row's shared `busyId` so the row's
   *  "Actions for…" dropdown trigger disables during a retarget submit,
   *  exactly as it did before this form was extracted out of that file (the
   *  whole row shared one busy flag when the form lived inline). Optional
   *  because the detail page's own caller has no equivalent shared busy
   *  indicator to drive. */
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => code.destination_url ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !validateDestination(draft).ok) return;
    setBusy(true);
    onBusyChange?.(true);
    try {
      const result = await retargetCode(code.id, draft);
      if (!result.ok) {
        onError(rowErrorMessage(result.error, "Couldn't retarget that code. Try again."));
        return;
      }
      onSuccess(code.id, result.data.destinationUrl, result.data.kvSynced);
    } catch {
      onError("Couldn't retarget that code. Try again.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex items-center gap-1.5", className)}>
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        placeholder="https://example.com"
        aria-label={`New destination for ${code.name}`}
        spellCheck={false}
        disabled={busy}
        className="h-8 flex-1 font-mono text-xs"
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={busy || !validateDestination(draft).ok}
        aria-label="Confirm retarget"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" onClick={onCancel} disabled={busy} aria-label="Cancel retarget">
        <X className="size-3.5" aria-hidden />
      </Button>
    </form>
  );
}
