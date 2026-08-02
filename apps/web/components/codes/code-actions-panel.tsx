"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PauseToggleButton } from "@/components/codes/pause-toggle-button";
import { RetargetControl } from "@/components/codes/retarget-control";
import { CodeAccessDialog } from "@/components/codes/code-access-dialog";
import { ExportCodeMenu } from "@/components/codes/export-code-menu";
import { formatDate } from "@/lib/date-format";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import type { Plan } from "@/lib/entitlements";

/**
 * The code detail page's action row (P9.6-U3) — Pause/Resume, Retarget,
 * Access controls, and Export, the four actions the page previously had
 * none of. Guards are unchanged: every action below still goes through its
 * existing server action (`retargetCode`/`setCodePaused`/`setCodeAccess`),
 * which still re-verifies with `getUser()` and passes through
 * `STUDIO_MUTATE_LIMIT` — this component only moves UI.
 *
 * Post-success strategy, deliberately different from the Studio rail
 * (`components/studio/codes-list.tsx`): every mutating control here reloads
 * the page on success (`window.location.reload()`) instead of patching
 * local React state. This is NOT a new mechanism — it's the exact same
 * primitive `components/codes/pause-toggle-button.tsx` already uses and
 * that has passed CI on every SHA it has shipped on (see that file's own
 * do-not-retry note; this file does not touch it). The reason a reload is
 * the right call HERE specifically: this page shows a code's
 * destination/expiry/protected state in more than one place (the header
 * above this card, and this card's own summary line below), and codes-list.tsx's
 * smooth-update alternative only works there because a list row keeps ALL
 * of a code's displayed state in one client component's own local state —
 * true here too if this were the only place that state rendered, but it
 * isn't. A full server round-trip is the simplest way to keep every copy on
 * the page honest at once, and it's a mechanism already proven reliable on
 * this exact route. Retarget/Access still call their server actions and
 * branch on the result exactly like codes-list.tsx does (same working
 * mechanism, unchanged) — only what happens after a SUCCESSFUL save
 * differs.
 */
export function CodeActionsPanel({
  code,
  plan,
  svg,
}: {
  code: DynamicCodeSummary;
  plan: Plan;
  svg: string | null;
}) {
  const [retargetOpen, setRetargetOpen] = useState(false);
  const [retargetError, setRetargetError] = useState<string | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);

  const accessLine = code.passwordProtected
    ? code.expiresAt
      ? `Protected · expires ${formatDate(code.expiresAt)}`
      : "Protected · no expiry"
    : code.expiresAt
      ? `Not protected · expires ${formatDate(code.expiresAt)}`
      : "Not protected · no expiry";

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Actions</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRetargetError(null);
            setRetargetOpen((v) => !v);
          }}
        >
          Retarget…
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => setAccessOpen(true)}>
          Access…
        </Button>

        {/* PauseToggleButton's own classes are sized for a compact table
            row (h-auto, p-0, ghost text-link look) — left byte-identical
            per that file's do-not-retry note, so it sits slightly lighter
            than the outline buttons beside it here rather than matching
            their chrome exactly. A bordered wrapper gives it the same
            footprint without touching the component itself. */}
        <span className="inline-flex h-7 items-center rounded-md border border-border/60 px-2.5">
          <PauseToggleButton id={code.id} paused={code.status === "paused"} />
        </span>

        {svg && <ExportCodeMenu svg={svg} name={code.name} />}
      </div>

      {retargetOpen && (
        <RetargetControl
          code={code}
          onSuccess={() => {
            window.location.reload();
          }}
          onError={setRetargetError}
          onCancel={() => {
            setRetargetOpen(false);
            setRetargetError(null);
          }}
        />
      )}
      {retargetError && (
        <p role="alert" className="text-xs text-destructive">
          {retargetError}
        </p>
      )}

      <p className="text-xs text-muted-foreground">{accessLine}</p>

      {accessOpen && (
        <CodeAccessDialog
          code={code}
          plan={plan}
          open
          onOpenChange={(open) => !open && setAccessOpen(false)}
          onSaved={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
