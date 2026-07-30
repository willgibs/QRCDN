"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, MoreHorizontal, X } from "lucide-react";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { codeState } from "@/lib/access";
import { validateDestination } from "@/lib/validation";
import type { Plan } from "@/lib/entitlements";
import {
  getDynamicCodeStyle,
  retargetCode,
  setCodePaused,
} from "@/app/(app)/studio/code-actions";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import { CodeAccessDialog } from "@/components/studio/code-access-dialog";

const ROW_NOTICE_TIMEOUT_MS = 6000;

const GENERIC_ROW_ERROR = "Couldn't complete that — try again.";
// P8-U4: retargetCode/setCodePaused are now rate-limited (STUDIO_MUTATE_LIMIT).
const RATE_LIMITED_ROW_ERROR = "Too many changes just now — try again in a few minutes.";

type RowNotice = { id: string; kind: "error" | "propagating"; message: string };

/** `rate_limited` overrides whatever generic copy the caller would otherwise
 *  show for a failed row action — every other error code keeps falling back
 *  to `fallback`, same collapse-to-generic stance the rest of this action
 *  surface already takes for codes it doesn't have specific copy for. */
function rowErrorMessage(error: string, fallback: string): string {
  return error === "rate_limited" ? RATE_LIMITED_ROW_ERROR : fallback;
}

/** Status dot+label — every state renders as labeled text, never a bare
 *  dot (founder rule). "archived" is unreachable through any action in this
 *  unit (qr_codes has no delete/archive path yet) but handled honestly
 *  anyway, matching the codebase's stance on defensively reading persisted
 *  rows rather than assuming only the states the UI itself can produce. */
function statusMeta(
  status: string,
  expiresAt?: string | null,
): { label: string; dotClassName: string; textClassName: string } {
  // Expiry folded in via lib/access.ts: a code past its expires_at keeps
  // status "active" in the DB but no longer reaches its destination, so
  // labeling it "Active" here would misreport a dead code as live.
  switch (codeState(status, expiresAt)) {
    case "paused":
      return { label: "Paused", dotClassName: "bg-muted-foreground/50", textClassName: "text-muted-foreground" };
    case "archived":
      return { label: "Archived", dotClassName: "bg-muted-foreground/30", textClassName: "text-muted-foreground" };
    case "expired":
      return { label: "Expired", dotClassName: "bg-destructive", textClassName: "text-destructive" };
    default:
      return { label: "Active", dotClassName: "bg-emerald-500", textClassName: "text-foreground" };
  }
}

/**
 * The studio rail's "Codes" section (P5-U4) — lists the caller's dynamic
 * codes (`listDynamicCodes`, fetched server-side in page.tsx and threaded
 * down through studio-shell.tsx, same flow as brand kits). A compact card
 * list rather than the vendored `Table` primitive: the rail is a fixed
 * ~300px column at lg+, nowhere near wide enough for a real multi-column
 * table without truncation fights, so each code gets a self-contained card
 * instead (mirrors kit-bar's dropdown-item precedent for "one row of
 * information + an actions menu").
 *
 * Row actions call the P5-U1 code-actions.ts functions directly (same
 * ownership split as KitBar: this component calls the server actions and
 * owns its own busy/error/transient-note state; the parent — studio-shell —
 * owns the canonical `codes` array and the working payload/style, updated
 * via the bubble-up callbacks below). Retarget is the one destructive-
 * adjacent action (it changes where a printed, live code sends people) and
 * gets an explicit-confirm inline form rather than firing on menu-select;
 * Pause/Resume are safely reversible single-click actions per the same
 * reasoning documented in code-actions.ts.
 */
export function CodesList({
  codes,
  plan,
  onCodeLoad,
  onRetargeted,
  onPauseToggled,
  onAccessUpdated,
}: {
  codes: DynamicCodeSummary[];
  /** P7.5-U2: gates the access-controls dialog's Pro-lock affordance —
   *  threaded down from studio/page.tsx via StudioShell/ControlsRail. */
  plan: Plan;
  /** Bubbles the loaded (parsed) frozen style up alongside the code whose
   *  short URL should become the working payload — studio-shell sets both
   *  in one place, mirroring `handleSwitch` for brand kits. This is a COPY
   *  into the working editor, never a live binding back to the row (D5). */
  onCodeLoad: (code: DynamicCodeSummary, style: QrStyle) => void;
  onRetargeted: (id: string, destinationUrl: string) => void;
  onPauseToggled: (id: string, status: string) => void;
  /** Bubbles a successful access-controls save up — studio-shell patches
   *  the matching row in its canonical `codes` array, same refresh pattern
   *  as onRetargeted/onPauseToggled. */
  onAccessUpdated: (id: string, patch: { expiresAt: string | null; passwordProtected: boolean }) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retargetingId, setRetargetingId] = useState<string | null>(null);
  const [retargetDraft, setRetargetDraft] = useState("");
  const [notice, setNotice] = useState<RowNotice | null>(null);
  const [accessDialogCodeId, setAccessDialogCodeId] = useState<string | null>(null);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function showNotice(id: string, kind: RowNotice["kind"], message: string) {
    setNotice({ id, kind, message });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ROW_NOTICE_TIMEOUT_MS);
  }

  function startRetarget(code: DynamicCodeSummary) {
    setNotice(null);
    setRetargetDraft(code.destination_url ?? "");
    setRetargetingId(code.id);
  }

  function cancelRetarget() {
    setRetargetingId(null);
    setRetargetDraft("");
  }

  async function handleLoad(code: DynamicCodeSummary) {
    if (busyId) return;
    setBusyId(code.id);
    try {
      const result = await getDynamicCodeStyle(code.id);
      if (!result.ok) {
        showNotice(code.id, "error", GENERIC_ROW_ERROR);
        return;
      }
      onCodeLoad(code, result.data);
    } catch {
      showNotice(code.id, "error", GENERIC_ROW_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetargetSubmit(id: string) {
    if (busyId || !validateDestination(retargetDraft).ok) return;
    setBusyId(id);
    try {
      const result = await retargetCode(id, retargetDraft);
      if (!result.ok) {
        showNotice(id, "error", rowErrorMessage(result.error, "Couldn't retarget that code — try again."));
        return;
      }
      onRetargeted(id, result.data.destinationUrl);
      if (!result.data.kvSynced) {
        showNotice(id, "propagating", "Propagating (~1 min)");
      }
      cancelRetarget();
    } catch {
      showNotice(id, "error", "Couldn't retarget that code — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePauseToggle(code: DynamicCodeSummary) {
    if (busyId) return;
    const nextPaused = code.status !== "paused";
    setBusyId(code.id);
    try {
      const result = await setCodePaused(code.id, nextPaused);
      if (!result.ok) {
        showNotice(code.id, "error", rowErrorMessage(result.error, GENERIC_ROW_ERROR));
        return;
      }
      onPauseToggled(code.id, result.data.status);
      if (!result.data.kvSynced) {
        showNotice(code.id, "propagating", "Propagating (~1 min)");
      }
    } catch {
      showNotice(code.id, "error", GENERIC_ROW_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  if (codes.length === 0) {
    return <p className="text-xs text-muted-foreground">No dynamic codes yet — create one above.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {codes.map((code) => {
        const status = statusMeta(code.status, code.expiresAt);
        const isRetargeting = retargetingId === code.id;
        const isBusy = busyId === code.id;
        const rowNotice = notice?.id === code.id ? notice : null;

        return (
          <div key={code.id} className="flex flex-col gap-1.5 rounded-xl border border-border/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{code.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isBusy}
                    aria-label={`Actions for ${code.name}`}
                  >
                    {isBusy ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <MoreHorizontal className="size-3.5" aria-hidden />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => handleLoad(code)}>Load in studio</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => startRetarget(code)}>Retarget…</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handlePauseToggle(code)}>
                    {code.status === "paused" ? "Resume" : "Pause"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      // Keep the dropdown's own close/focus-return from
                      // racing the Dialog's open transition — the Dialog
                      // takes over focus management itself once open.
                      e.preventDefault();
                      setAccessDialogCodeId(code.id);
                    }}
                  >
                    Access…
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/codes/${code.slug}`}>View analytics</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {accessDialogCodeId === code.id && (
              <CodeAccessDialog
                code={code}
                plan={plan}
                open
                onOpenChange={(open) => !open && setAccessDialogCodeId(null)}
                onSaved={onAccessUpdated}
              />
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-muted-foreground">{code.slug}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", status.dotClassName)} />
                  <span className={status.textClassName}>{status.label}</span>
                  {code.passwordProtected ? (
                    <span className="text-muted-foreground">· Protected</span>
                  ) : null}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {code.scan_count.toLocaleString()} scans
                </span>
              </div>
            </div>

            {isRetargeting && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRetargetSubmit(code.id);
                }}
                className="flex items-center gap-1.5 pt-0.5"
              >
                <Input
                  autoFocus
                  value={retargetDraft}
                  onChange={(e) => setRetargetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelRetarget();
                  }}
                  placeholder="https://example.com"
                  aria-label={`New destination for ${code.name}`}
                  spellCheck={false}
                  disabled={isBusy}
                  className="h-8 flex-1 font-mono text-xs"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  disabled={isBusy || !validateDestination(retargetDraft).ok}
                  aria-label="Confirm retarget"
                >
                  {isBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={cancelRetarget}
                  disabled={isBusy}
                  aria-label="Cancel retarget"
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </form>
            )}

            {rowNotice && (
              <p
                role={rowNotice.kind === "error" ? "alert" : "status"}
                className={cn(
                  "text-xs",
                  rowNotice.kind === "error" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {rowNotice.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
