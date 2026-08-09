"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { validateDestination } from "@/lib/validation";
import { suggestCodeName } from "@/lib/code-name";
import { printedShortUrl } from "@/lib/short-url";
import { MAX_SLUG_LENGTH, MIN_SLUG_LENGTH, SLUG_CHARSET } from "@/lib/slug";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { createDynamicCode } from "@/app/(app)/studio/code-actions";
import type { KitPickerKit } from "@/lib/brand-kits";
import { KitPicker, defaultKitId } from "./kit-picker";

const COPY_FLASH_TIMEOUT_MS = 1600;

// Single-sourced against lib/slug.ts's SLUG_CHARSET/MIN_SLUG_LENGTH/
// MAX_SLUG_LENGTH (P7.5-U3, cap tightened P9.8-B3), so this helper text can
// never drift from the charset and bounds validateVanitySlug actually
// enforces. Ported from studio/create-code.tsx before that file was deleted.
const SLUG_HELPER_TEXT = `${MIN_SLUG_LENGTH}–${MAX_SLUG_LENGTH} characters from ${SLUG_CHARSET}: no 0, 1, I, L, O, or U (they misprint)`;

const GENERIC_ERROR = "Couldn't create that code. Try again.";
// P9.5-T8 item 5 pattern (CLAUDE.md: entitlement limits live in
// entitlements.ts only) — interpolated once at module scope, not hand-typed.
const CODE_LIMIT_MESSAGE = `Free includes ${PLAN_LIMITS.free.dynamicCodes} dynamic codes. Pro raises it to ${PLAN_LIMITS.pro.dynamicCodes}.`;

// Every code createDynamicCode/createDynamicCodeCore can return, mapped to
// copy a person can act on (code-access-dialog.tsx's ERROR_COPY + fallback
// pattern) — slug_taken/slug_reserved/invalid_slug are ALSO in this same
// record (rendered inline under the slug field instead of the general error
// area below; see isSlugError/slugError state) rather than a second,
// separate lookup the way create-code.tsx split CreateError/SlugError before
// this unit: one flat record, two display locations.
const ERROR_COPY: Record<string, string> = {
  name_required: "Give the code a name.",
  name_too_long: "Keep the name under 60 characters.",
  invalid_destination: "Enter a valid https:// destination.",
  destination_too_long: "That destination is too long.",
  code_limit: CODE_LIMIT_MESSAGE,
  vanity_slugs_not_available: "Custom links are a Pro feature.",
  invalid_slug: SLUG_HELPER_TEXT,
  slug_reserved: "That word is reserved.",
  slug_taken: "That link is taken.",
  slug_exhausted: "Couldn't find an open link. Try again.",
  destination_unsafe: "That destination was flagged as unsafe.",
  brand_kit_not_found: "That brand kit no longer exists. Pick another.",
  invalid_style: "That kit's style couldn't be read. Try a different kit.",
  profile_not_found: "Couldn't find your account. Try again.",
  // P8-U4: createDynamicCode is rate-limited (STUDIO_MUTATE_LIMIT).
  rate_limited: "Too many changes just now. Try again in a few minutes.",
};

function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? GENERIC_ERROR;
}

function isSlugError(error: string): boolean {
  return error === "invalid_slug" || error === "slug_reserved" || error === "slug_taken";
}

/**
 * "Create dynamic code" dialog (P9.8-B2) — creation's new home now that the
 * studio is kits-only. Follows `CodeAccessDialog`'s conventions exactly:
 * `useId` per field, a flat `ERROR_COPY` record + fallback, `DialogHeader`/
 * `Title`/`Description`, a `DialogFooter` Cancel + submit-with-spinner, and
 * the same conditional-mount contract that component's own doc comment
 * establishes. Callers MUST mount this conditionally on their own open state
 * (`{open && <CreateCodeDialog ... open .../>}`), never unconditionally with
 * just `open={boolean}` — draft state (name/destination/selected kit/slug)
 * initializes via `useState` once, at mount, so an always-mounted instance
 * would keep showing the previous session's draft, or a stale success card,
 * the next time `open` flips back to `true`. `components/codes/codes-
 * header-actions.tsx` is this component's one call site; see its own doc
 * comment for why `BulkCreateDialog` doesn't need the same treatment.
 *
 * Every code attaches to a kit and mirrors its style (hard sync, P9.8-B1, D5
 * as amended) — the server reads the SELECTED kit's SAVED style; this
 * dialog never sends one. Submission is disabled until a kit exists
 * (`KitPicker` returns nothing when `kits` is empty; the helper text below
 * says why), the same invariant `create-code.tsx`'s `CreateCodeControl`
 * enforced before this unit moved and deleted it.
 *
 * Success state is adapted from that same file's minted card: the short URL
 * (`role="status" aria-label="New short URL"` — e2e/money-path.spec.ts
 * depends on this exact accessible name), a copy button with a 1600ms
 * "Copied" flash, a "View analytics" link (there's no artifact on stage
 * here to point at, unlike the studio's version of this card), and "Create
 * another" to mint a second code without closing. The dialog itself tracks
 * whether ANY mint succeeded during this open session (`hadSuccessRef`) and
 * reloads the page when it closes if so, so the `/codes` Server Component
 * re-fetches and the new row actually shows up.
 *
 * `window.location.reload()`, deliberately NOT `router.refresh()`: tried
 * first (matches the spec this unit shipped from), and it measurably failed
 * this unit's own e2e verification run against a production build (the
 * table stayed empty after closing the dialog) — the exact CI-only failure
 * mode `components/codes/pause-toggle-button.tsx`'s doc comment already
 * documents in detail for the identical "mutate, then reflect fresh server
 * data" shape ("DO NOT improve this to router.refresh()... every mechanism
 * that depends on Next's client router applying a fresh render in place has
 * passed locally and failed in CI"). A hard reload has no such ambiguity: a
 * brand-new document load, unconditionally.
 */
export function CreateCodeDialog({
  kits,
  plan,
  open,
  onOpenChange,
}: {
  kits: KitPickerKit[];
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const nameId = useId();
  const destinationId = useId();

  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [destination, setDestination] = useState("");
  const [selectedKitId, setSelectedKitId] = useState<string | null>(() => defaultKitId(kits));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugOpen, setSlugOpen] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [mintedShortUrl, setMintedShortUrl] = useState<string | null>(null);
  const [mintedSlug, setMintedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks "did at least one mint succeed this session" across a "Create
  // another" reset — a ref, not state, since it never drives a render on
  // its own; handleOpenChange only reads it at close time.
  const hadSuccessRef = useRef(false);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const destinationValid = validateDestination(destination).ok;
  const vanitySlugsLocked = !PLAN_LIMITS[plan].vanitySlugs;
  const noKits = kits.length === 0;
  const canSubmit = name.trim().length > 0 && destinationValid && selectedKitId !== null && !noKits;

  function resetDraft() {
    setName("");
    setNameEdited(false);
    setDestination("");
    setError(null);
    setSlugOpen(false);
    setCustomSlug("");
    setSlugError(null);
    setMintedShortUrl(null);
    setMintedSlug(null);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next && hadSuccessRef.current) {
      // The /codes page is a Server Component — a freshly-minted code only
      // shows up in its table once that component re-fetches. See this
      // file's own doc comment for why a hard reload, not router.refresh().
      window.location.reload();
      return;
    }
    if (!next) {
      hadSuccessRef.current = false;
      resetDraft();
    }
    onOpenChange(next);
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    // Auto-suggest from the hostname until the caller types their own name —
    // same behavior create-code.tsx's naming phase had, adapted to fields
    // that are now peers in one form instead of sequential steps.
    if (!nameEdited) {
      setName(suggestCodeName(value));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || busy || selectedKitId === null) return;
    setBusy(true);
    setError(null);
    setSlugError(null);
    try {
      const slug = !vanitySlugsLocked && customSlug.trim().length > 0 ? customSlug.trim() : undefined;
      const result = await createDynamicCode({
        name: name.trim(),
        destination,
        brandKitId: selectedKitId,
        slug,
      });
      if (!result.ok) {
        if (isSlugError(result.error)) {
          setSlugError(result.error);
        } else {
          setError(result.error);
        }
        return;
      }
      hadSuccessRef.current = true;
      setMintedShortUrl(printedShortUrl(result.data.slug));
      setMintedSlug(result.data.slug);
    } catch {
      setError("unexpected");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!mintedShortUrl) return;
    try {
      await navigator.clipboard.writeText(mintedShortUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), COPY_FLASH_TIMEOUT_MS);
    } catch {
      // Clipboard access denied/unavailable — the short URL is still
      // visible and selectable by hand; no error UI for a nice-to-have.
    }
  }

  function handleCreateAnother() {
    setMintedShortUrl(null);
    setMintedSlug(null);
    setCopied(false);
    setName("");
    setNameEdited(false);
    setDestination("");
    setCustomSlug("");
    setSlugOpen(false);
    setSlugError(null);
    setError(null);
    // selectedKitId deliberately survives the reset — minting a second code
    // onto the same kit is the common case.
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create dynamic code</DialogTitle>
          <DialogDescription>
            Name it, give it a destination, and pick a brand kit. It attaches to that kit and mirrors its style.
          </DialogDescription>
        </DialogHeader>

        {mintedShortUrl ? (
          <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              {/* role="status" + aria-label (e2e/money-path.spec.ts depends
                  on this exact accessible name). */}
              <span
                role="status"
                aria-label="New short URL"
                className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
              >
                {mintedShortUrl}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={copied ? "Copied" : "Copy short URL"}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3.5 text-(--ok)" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Link
                href={`/codes/${mintedSlug}`}
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                View analytics
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCreateAnother}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                Create another
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(e) => {
                  setNameEdited(true);
                  setName(e.target.value);
                }}
                placeholder="Menu"
                maxLength={60}
                required
                disabled={busy}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={destinationId}>Destination</Label>
              <Input
                id={destinationId}
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="https://example.com"
                spellCheck={false}
                disabled={busy}
                className="font-mono text-xs"
              />
            </div>

            <KitPicker kits={kits} selectedKitId={selectedKitId} onChange={setSelectedKitId} disabled={busy} />
            {noKits && (
              <p className="text-xs text-muted-foreground">
                Create a brand kit first: every code attaches to one.
              </p>
            )}

            {/* "Customize link" disclosure (P7.5-U3), ported from
                create-code.tsx before that file was deleted — collapsed by
                default, a plain toggle button. */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                aria-expanded={slugOpen}
                onClick={() => setSlugOpen((v) => !v)}
                className="w-fit text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {slugOpen ? "Hide custom link" : "Customize link"}
              </button>

              {slugOpen && (
                <div className="flex flex-col gap-1">
                  {vanitySlugsLocked ? (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Input
                              value=""
                              placeholder="PARTY26"
                              aria-label="Custom link (Pro)"
                              disabled
                              className="h-8 flex-1 font-mono text-xs"
                            />
                            <span className="shrink-0 rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                              Pro
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Upgrade to Pro for custom links</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Input
                      value={customSlug}
                      onChange={(e) => {
                        setCustomSlug(e.target.value);
                        setSlugError(null);
                      }}
                      placeholder="PARTY26"
                      aria-label="Custom link"
                      maxLength={MAX_SLUG_LENGTH}
                      disabled={busy}
                      spellCheck={false}
                      className="h-8 font-mono text-xs"
                    />
                  )}
                  <p className="text-[11px] leading-snug text-muted-foreground">{SLUG_HELPER_TEXT}</p>
                  {slugError && (
                    <p role="alert" className="text-xs text-destructive">
                      {errorCopy(slugError)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              // code_limit is an upgrade nudge, not a failure — muted like
              // kit-bar's own limitError/actionError distinction; everything
              // else is a real failure (destructive-red).
              <p
                role="alert"
                className={cn("text-xs", error === "code_limit" ? "text-muted-foreground" : "text-destructive")}
              >
                {errorCopy(error)}
              </p>
            )}
          </div>
        )}

        {!mintedShortUrl && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={busy || !canSubmit}>
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Create"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
