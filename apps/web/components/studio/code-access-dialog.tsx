"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { setCodeAccess } from "@/app/(app)/studio/code-actions";
import type { DynamicCodeSummary } from "@/lib/codes-core";

const GENERIC_ERROR = "Couldn't save that. Try again.";

// Map the server's error codes to copy the user can act on. Without this every
// failure read "try again", which is actively misleading for a validation
// problem: an empty save or a too-short password isn't transient, and retrying
// the same input can only fail again. (Red-teaming also showed the generic
// string masking a genuine 500 — see lib/use-server-contract.test.ts.)
const ERROR_COPY: Record<string, string> = {
  empty_patch: "Set an expiry or a password first.",
  invalid_expiry: "That expiry date isn't valid.",
  invalid_password: "Passwords must be 4–128 characters.",
  plan_required: "Access controls are a Pro feature.",
  not_found: "That code no longer exists. Refresh and try again.",
  // P8-U4: setCodeAccess is now rate-limited (STUDIO_MUTATE_LIMIT).
  rate_limited: "Too many changes just now. Try again in a few minutes.",
};

function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? GENERIC_ERROR;
}

/**
 * ISO-8601 UTC <-> the `<input type="datetime-local">` value shape
 * (`YYYY-MM-DDTHH:mm`, LOCAL time, no timezone/seconds). Conversion happens
 * ONLY at this boundary — every other layer (validateCodeAccessInput,
 * qr_codes.expires_at, KvSlugRecord.expiresAt) stays ISO-8601 UTC, per
 * validation.ts's parseExpiresAt.
 */
function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputValueToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * "Access…" dialog on a codes-list row (P7.5-U2) — the vendored `Dialog`
 * primitive's first consumer. Lets the caller set/clear an expiry and set/
 * remove a password on a dynamic code. Free-plan callers see the same
 * controls disabled behind a "Pro" pill + tooltip that
 * components/codes/range-selector.tsx uses for its own Pro-locked range
 * options — same affordance, new surface.
 *
 * Save calls the `setCodeAccess` server action (code-actions.ts,
 * requireUserContext — same destructive-adjacent tier as retarget/pause:
 * this changes what a printed, live code does when scanned) and, on
 * success, bubbles the new `{expiresAt, passwordProtected}` up via
 * `onSaved` so the caller (codes-list.tsx -> studio-shell.tsx) can refresh
 * its `codes` state exactly the way retarget/pause already do.
 */
export function CodeAccessDialog({
  code,
  plan,
  open,
  onOpenChange,
  onSaved,
}: {
  code: DynamicCodeSummary;
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string, patch: { expiresAt: string | null; passwordProtected: boolean }) => void;
}) {
  const expiresId = useId();
  const passwordId = useId();

  const locked = !PLAN_LIMITS[plan].accessControls;
  const [expiresDraft, setExpiresDraft] = useState(() => isoToLocalInputValue(code.expiresAt));
  const [passwordDraft, setPasswordDraft] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiresLabel = code.expiresAt ? `expires ${new Date(code.expiresAt).toLocaleString()}` : "no expiry";
  const currentStateLine = `${code.passwordProtected ? "Protected" : "Not protected"} · ${expiresLabel}`;

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Drafts reset on close (whether cancelled or saved) so reopening the
      // dialog always starts from the code's current persisted state, never
      // a stale in-progress edit from a previous open.
      setExpiresDraft(isoToLocalInputValue(code.expiresAt));
      setPasswordDraft("");
      setRemovePassword(false);
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSave() {
    if (busy || locked) return;
    setBusy(true);
    setError(null);
    try {
      const input: { expiresAt?: string | null; password?: string | null } = {
        expiresAt: localInputValueToIso(expiresDraft),
      };
      if (removePassword) {
        input.password = null;
      } else if (passwordDraft.length > 0) {
        input.password = passwordDraft;
      }
      const result = await setCodeAccess(code.id, input);
      if (!result.ok) {
        setError(errorCopy(result.error));
        return;
      }
      onSaved(code.id, {
        expiresAt: result.data.expiresAt,
        passwordProtected: result.data.passwordProtected,
      });
      handleOpenChange(false);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Access controls</DialogTitle>
          <DialogDescription>{currentStateLine}</DialogDescription>
        </DialogHeader>

        {locked ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    Pro
                  </span>
                  Expiry and password protection are Pro features.
                </div>
              </TooltipTrigger>
              <TooltipContent>Upgrade to Pro for expiry and password protection</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={expiresId}>Expires</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={expiresId}
                  type="datetime-local"
                  value={expiresDraft}
                  onChange={(e) => setExpiresDraft(e.target.value)}
                  disabled={busy}
                  className="flex-1"
                />
                {expiresDraft && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpiresDraft("")}
                    disabled={busy}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={passwordId}>Password</Label>
              <Input
                id={passwordId}
                type="password"
                value={passwordDraft}
                onChange={(e) => {
                  setPasswordDraft(e.target.value);
                  setRemovePassword(false);
                }}
                placeholder={code.passwordProtected ? "Leave blank to keep current password" : "4-128 characters"}
                disabled={busy || removePassword}
                autoComplete="new-password"
              />
              {code.passwordProtected && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRemovePassword((prev) => !prev);
                    setPasswordDraft("");
                  }}
                  disabled={busy}
                  className="w-fit text-muted-foreground hover:text-destructive"
                >
                  {removePassword ? "Password will be removed" : "Remove password"}
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={busy || locked}>
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
