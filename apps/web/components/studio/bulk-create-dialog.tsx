"use client";

import { useState, useRef, useMemo } from "react";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { suggestCodeName } from "@/lib/code-name";
import { downloadBlob } from "@/lib/export";
import { buildResultsCsv } from "@/lib/csv";
import { createDynamicCodesBulk, listDynamicCodes } from "@/app/(app)/studio/code-actions";
import type { BulkItemOutcome, DynamicCodeSummary } from "@/lib/codes-core";

const COPY_FLASH_TIMEOUT_MS = 1600;

// Mirrors lib/codes-core.ts's own `BULK_MAX` — duplicated, not imported:
// codes-core.ts pulls in lib/passwords.ts (`node:crypto`) and lib/kv-sync.ts
// (server env vars), so it's a server-only module by transitive dependency
// even though it has no "server-only" import guard. Every existing client
// surface reaches its logic exclusively through the "use server" wrapper in
// code-actions.ts; this constant is the one piece of that file a client
// component actually needs, and a "use server" module can only export async
// functions (Next.js constraint), so it can't be re-exported through there
// either. The real enforcement is server-side either way — this local copy
// is purely for the pre-submit hint/disable, not a security boundary.
const BULK_MAX = 50;

const BATCH_ERROR_MESSAGES: Record<string, string> = {
  empty_batch: "Paste at least one destination.",
  batch_too_large: `Max ${BULK_MAX} per batch.`,
  code_limit: "That batch would put you over your plan's code limit.",
  bulk_not_available: "Bulk creation is a Pro feature.",
  profile_not_found: "Couldn't find your account. Try again.",
  // P8-U4: createDynamicCodesBulk is now rate-limited (STUDIO_MUTATE_LIMIT).
  rate_limited: "Too many changes just now. Try again in a few minutes.",
};
const GENERIC_BATCH_ERROR = "Couldn't create those codes. Try again.";

// P8-U5: createDynamicCodesBulkCore's Safe Browsing screen
// (lib/safe-browsing.ts) fails a flagged destination as ITS OWN item
// outcome (never the whole-batch error above — see BATCH_ERROR_MESSAGES's
// callers, which only ever fire for the whole call, not one line) so this
// gets its own small lookup for the per-item error rendered in each failure
// row below. Every other per-item error code (invalid_destination,
// slug_taken, the raw zod message for a bad name, ...) still renders as the
// literal string codes-core.ts returns — unchanged pre-existing behavior,
// not something this unit is here to fix.
const ITEM_ERROR_MESSAGES: Partial<Record<string, string>> = {
  destination_unsafe: "That destination was flagged as unsafe.",
};

function itemErrorMessage(error: string): string {
  return ITEM_ERROR_MESSAGES[error] ?? error;
}

const PLACEHOLDER = "Menu | https://example.com/menu\nhttps://example.com/promo";

interface BulkDraftItem {
  name: string;
  destination: string;
}

/**
 * Parses the textarea's pasted text into create-ready items — one line per
 * code, blanks skipped, `Name | https://url` optional (split on the FIRST
 * `|` only, so a destination containing `|` in its query string still parses
 * as intended). A line with no `|`, or an empty name before one, gets its
 * name auto-suggested from the destination's hostname (`suggestCodeName`,
 * lib/code-name.ts) — done CLIENT-SIDE rather than left for the server: the
 * already-written/tested `createDynamicCodesBulkCore` (lib/codes-core.ts)
 * runs `validateDynamicCodeInput` per item exactly as specced, with no
 * name-suggestion branch of its own, so suggesting here keeps the server
 * behavior unchanged and fully covered by its existing test suite instead of
 * growing new, untested server logic to match.
 */
function parseBulkDraft(raw: string): BulkDraftItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const sep = line.indexOf("|");
      if (sep === -1) {
        const destination = line;
        return { name: suggestCodeName(destination), destination };
      }
      const rawName = line.slice(0, sep).trim();
      const destination = line.slice(sep + 1).trim();
      return { name: rawName.length > 0 ? rawName : suggestCodeName(destination), destination };
    });
}

// csvField/buildResultsCsv live in lib/csv.ts — unit-testable there, and they
// carry a spreadsheet-formula-injection guard (see that file).

/**
 * The studio rail's "Bulk create" affordance (P7.5-U4) — a Dialog (the
 * vendored `Dialog` primitive's second consumer, after `CodeAccessDialog`)
 * that parses a pasted batch of destinations client-side and hands the
 * parsed items to `createDynamicCodesBulk` in one call, then reports partial
 * success: which lines became live codes, which didn't, and why.
 *
 * Pro-locked exactly like `CodeAccessDialog`'s own `accessControls` branch —
 * free-plan callers can still open the dialog (the trigger always works),
 * they just see the upsell block instead of the textarea, matching
 * components/codes/range-selector.tsx's Pro pill/tooltip affordance for the
 * "still visible, clearly locked" register this codebase uses everywhere
 * else instead of hiding a feature outright.
 *
 * List-update-on-success: a `BulkItemOutcome` only carries
 * `{name, ok, slug, url}` — not the full `id`/`status`/`scan_count`/
 * `created_at`/etc. a `DynamicCodeSummary` row needs, so there's no honest
 * way to synthesize new rows the way `handleCodeCreated` does for a single
 * create (which gets the FULL `QrCode` row back). Instead, on dialog close
 * with at least one success, this refetches the caller's whole list
 * (`listDynamicCodes`) and hands it up via `onCodesRefreshed`, which
 * studio-shell.tsx wires straight to `setCodes` — one extra round-trip per
 * batch, in exchange for every field (status, scan_count, timestamps) being
 * real instead of guessed.
 */
export function BulkCreateDialog({
  plan,
  activeKitId,
  kitDirty,
  codeCount,
  onCodesRefreshed,
}: {
  plan: Plan;
  /** P9.8-B1: every code in the batch attaches to this kit and mirrors its
   *  SAVED style (read server-side). Submit waits while the working style
   *  is dirty, same reasoning as CreateCodeControl. */
  activeKitId: string | null;
  kitDirty: boolean;
  /** studio-shell's `codes.length` — current dynamic-code count, for the
   *  live "N of M remaining" counter. UI-only; the actual cap is enforced
   *  server-side by `createDynamicCodesBulkCore`. */
  codeCount: number;
  onCodesRefreshed: (codes: DynamicCodeSummary[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkItemOutcome[] | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = !PLAN_LIMITS[plan].bulk;
  const limit = PLAN_LIMITS[plan].dynamicCodes;
  const remaining = Math.max(0, limit - codeCount);

  const items = useMemo(() => parseBulkDraft(draft), [draft]);
  const overCap = items.length > BULK_MAX || items.length > remaining;
  // P9.8-B1: the whole batch mints from the SAVED kit server-side, so
  // submit waits for a kit to exist and its working edits to be saved.
  const kitBlocked = activeKitId === null || kitDirty;
  const canSubmit = items.length > 0 && !overCap && !busy && !kitBlocked;

  function resetDraftState() {
    setDraft("");
    setError(null);
    setResults(null);
    setCopiedUrl(null);
  }

  async function handleOpenChange(next: boolean) {
    if (!next) {
      // Sync the parent's canonical list exactly once, right as the dialog
      // closes — never mid-session while results are still on screen (the
      // user may still be reading failures or about to export the CSV).
      if (results && results.some((r) => r.ok)) {
        const refreshed = await listDynamicCodes();
        if (refreshed.ok) {
          onCodesRefreshed(refreshed.data);
        }
      }
      resetDraftState();
    }
    setOpen(next);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createDynamicCodesBulk(items, activeKitId);
      if (!result.ok) {
        setError(BATCH_ERROR_MESSAGES[result.error] ?? GENERIC_BATCH_ERROR);
        return;
      }
      setResults(result.data);
    } catch {
      setError(GENERIC_BATCH_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyRow(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedUrl(null), COPY_FLASH_TIMEOUT_MS);
    } catch {
      // Clipboard access denied/unavailable — the url is still visible and
      // selectable by hand, same stance as create-code.tsx's own handleCopy.
    }
  }

  function handleExportCsv() {
    if (!results) return;
    const csv = buildResultsCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `qrcdn-codes-${date}.csv`);
  }

  const successes = results?.filter((r): r is Extract<BulkItemOutcome, { ok: true }> => r.ok) ?? [];
  const failures = results?.filter((r): r is Extract<BulkItemOutcome, { ok: false }> => !r.ok) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "w-fit gap-1.5",
            locked ? "text-muted-foreground" : "text-primary hover:bg-primary/10 hover:text-primary",
          )}
        >
          Bulk create
          {locked && (
            <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
              Pro
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk create</DialogTitle>
          {!locked && !results && (
            <DialogDescription>
              One destination per line. Optionally <code className="font-mono">Name | https://url</code>.
            </DialogDescription>
          )}
        </DialogHeader>

        {locked ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    Pro
                  </span>
                  Bulk creation is a Pro feature.
                </div>
              </TooltipTrigger>
              <TooltipContent>Upgrade to Pro for bulk code creation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : results ? (
          <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
            {successes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">{successes.length} created</p>
                {successes.map((outcome) => (
                  <div
                    key={outcome.slug}
                    className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-foreground">{outcome.name}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{outcome.url}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={copiedUrl === outcome.url ? "Copied" : `Copy ${outcome.url}`}
                      onClick={() => handleCopyRow(outcome.url)}
                    >
                      {copiedUrl === outcome.url ? (
                        <Check className="size-3.5 text-primary" aria-hidden />
                      ) : (
                        <Copy className="size-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {failures.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-destructive">{failures.length} failed</p>
                {failures.map((outcome, i) => (
                  <div
                    key={`${outcome.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                      {outcome.name || "(unnamed)"}
                    </span>
                    <span role="alert" className="shrink-0 text-xs text-destructive">
                      {itemErrorMessage(outcome.error)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={PLACEHOLDER}
              aria-label="Bulk destinations"
              spellCheck={false}
              disabled={busy}
              rows={8}
              className="font-mono text-xs"
            />
            <p className={cn("text-xs", overCap ? "text-destructive" : "text-muted-foreground")}>
              {items.length} to create · {remaining} of {limit} remaining
            </p>
            {kitBlocked && (
              <p className="text-xs text-muted-foreground">
                {activeKitId === null
                  ? "Create a brand kit first: every code in the batch attaches to one."
                  : "Save your kit first: the batch mints with its saved style."}
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {results ? (
            <>
              <Button type="button" variant="outline" onClick={handleExportCsv} className="gap-1.5">
                <Download className="size-3.5" aria-hidden />
                Export CSV
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={locked || !canSubmit}>
                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Create"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
