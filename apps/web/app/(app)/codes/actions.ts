"use server";

import { refresh } from "next/cache";
import { setCodePaused } from "@/app/(app)/studio/code-actions";

/**
 * Row-level pause/resume for the `/codes` overview table (P9.5-T7). A thin
 * wrapper, not a reimplementation: `setCodePaused`
 * (app/(app)/studio/code-actions.ts) already does everything the "changes
 * what a printed code does" family requires — getUser() re-verification
 * (not getClaims(), per the CLAUDE.md hard rule) and the STUDIO_MUTATE_LIMIT
 * rate gate — so this file adds nothing to that guard, it only adds the
 * server re-render the Studio's own client-side CodesList never needed
 * (that component patches its local React state from the action's return
 * value instead — see codes-list.tsx's onPauseToggled).
 *
 * `refresh()` (`next/cache`, callable only from Server Actions) re-fetches
 * the current route's RSC payload without invalidating any cache entry —
 * the exact shape of this problem ("the view depends on state outside the
 * cache that the action just changed," the docs' own words for this
 * primitive) since CodesTable's data isn't cached at all
 * (`export const dynamic = "force-dynamic"` on codes/page.tsx). Runs
 * unconditionally, whether or not the mutation actually succeeded (e.g.
 * rate-limited, or a race with another tab) — deliberate, not an oversight:
 * the table always re-renders from the real `qr_codes` row either way, so a
 * failed mutation just shows the unchanged (correct) status instead of a
 * silent lie. There is no dedicated error affordance on this row-level
 * control (unlike the Studio rail's client component); a caller who needs
 * failure feedback already has that surface.
 *
 * TWO REAL FINDINGS below, neither assumed — both confirmed live via the
 * e2e suite, not reasoned from docs alone (Next 16 gotcha — AGENTS.md:
 * "this is NOT the Next.js you know").
 *
 * Finding 1: a plain `<form action={thisAction.bind(null, id,
 * nextPaused)}>`, with no `useActionState`, DOES invoke this action
 * correctly (confirmed server-side: the mutation lands, `refresh()`/
 * `revalidatePath()` both run) but the browser does NOT apply the fresh RSC
 * payload the docs say the same response carries — the DOM keeps showing
 * the pre-mutation row until an unrelated navigation (e.g. a manual
 * reload). Tried both `revalidatePath("/codes")` and `refresh()` as the
 * cache-update call with the plain form; both had this exact symptom.
 * Switching the row's form to `useActionState` (`components/codes/
 * pause-toggle-button.tsx`, a `"use client"` leaf — same "small interactive
 * island inside an otherwise server-rendered tree" precedent
 * `components/marketing/copy-button.tsx` already sets inside `CodeBlock`)
 * fixed the FIRST submission immediately.
 *
 * Finding 2: `useActionState` alone was not sufficient for a SECOND
 * submission from the same mounted instance (pause, then resume, on the
 * same row without an intervening remount) — the mutation landed correctly
 * both times (proven server-side both times) but only the first submission's
 * fresh render actually reached the DOM; the second silently did not, no
 * error, no timeout, just a stuck row. `PauseToggleButton` is now rendered
 * with `key={code.status}` (codes-table.tsx) specifically so a status
 * change forces React to fully unmount and remount the button rather than
 * reuse the instance across submissions — that fresh mount is what makes
 * `useActionState`'s own refresh-application reliable every time, not just
 * the first. Without the key, the row worked once and then silently stopped
 * working; this is exactly the kind of bug automated coverage catches and a
 * one-off manual click-through would not (a person testing "does pause
 * work" almost never immediately tests "does resume work right after, on
 * the same row, in the same tab").
 *
 * This file's signature (`id, nextPaused, prevState`) matches what
 * `useActionState` requires once bound: `.bind(null, id, nextPaused)`
 * leaves exactly `(prevState, formData)` for the hook to drive.
 */
export async function toggleCodePausedAction(
  id: string,
  nextPaused: boolean,
  prevState: unknown,
): Promise<null> {
  // `prevState` is required in this position (useActionState's calling
  // convention is `(...boundArgs, prevState, formData)`) but genuinely
  // unused: this control tracks no state of its own — see this file's own
  // doc comment and pause-toggle-button.tsx's. This repo's eslint config
  // has no `argsIgnorePattern`, so an `_`-prefixed name alone does not
  // suppress `no-unused-vars` here (confirmed: it still warned) — `void`
  // marks the intent explicitly instead of relying on a naming convention
  // this config doesn't honor.
  void prevState;
  await setCodePaused(id, nextPaused);
  refresh();
  return null;
}
