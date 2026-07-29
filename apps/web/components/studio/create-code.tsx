"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SLUG_CHARSET } from "@/lib/slug";
import { PLAN_LIMITS, type Plan } from "@/lib/entitlements";
import { createDynamicCode } from "@/app/(app)/studio/code-actions";
import type { QrCode } from "@/lib/codes-core";

const COPY_FLASH_TIMEOUT_MS = 1600;
const CODE_LIMIT_MESSAGE = "Free includes 3 dynamic codes — Pro raises it to 250.";
const GENERIC_ERROR_MESSAGE = "Couldn't create that code — try again.";

// Single-sourced against lib/slug.ts's SLUG_CHARSET (P7.5-U3) rather than a
// hand-typed copy, so this helper text can never drift from the charset
// validateVanitySlug actually enforces.
const SLUG_HELPER_TEXT = `4–30 characters from ${SLUG_CHARSET} — no 0, 1, I, L, O, or U (they misprint)`;

type SlugError = "slug_taken" | "slug_reserved" | "invalid_slug";

const SLUG_ERROR_MESSAGES: Record<SlugError, string> = {
  slug_taken: "That link is taken.",
  slug_reserved: "That word is reserved.",
  invalid_slug: SLUG_HELPER_TEXT,
};

function isSlugError(error: string): error is SlugError {
  return error === "slug_taken" || error === "slug_reserved" || error === "invalid_slug";
}

type Phase = "idle" | "naming";

/**
 * The studio's "Create dynamic code" affordance (P5-U4). Lives beneath the
 * Destination input in ControlsRail's Payload section, replacing the old
 * "Static preview only" helper text now that P5 is live.
 *
 * Flow: idle button -> inline name entry (kit-bar's inline-input pattern:
 * prefilled from the destination hostname, Enter confirms, Esc cancels) ->
 * createDynamicCode({ name, destination: payload, style }) -> a calm
 * confirmation surface with the minted short URL + copy-to-clipboard.
 *
 * The confirmation surface is derived, not stored as its own phase: it
 * shows whenever `mintedShortUrl` is set AND the live `payload` prop still
 * equals it. That second condition is deliberate — `onCreated` bubbles up
 * to studio-shell, which sets the working `payload` to the new short URL
 * (the product moment: "the QR on stage IS the live code"). If the caller
 * then edits the Destination field again to mint a *different* code, this
 * component quietly reverts to the idle button on its own, with no extra
 * state to reconcile — the confirmation card was only ever a comment on
 * "what does `payload` currently hold," and that's still true here.
 */
export function CreateCodeControl({
  payload,
  style,
  plan,
  onCreated,
}: {
  payload: string;
  style: QrStyle;
  /** Gates the "Customize link" disclosure's vanity-slug input — Pro-only
   *  (PLAN_LIMITS[plan].vanitySlugs, P7.5-U3). Threaded from studio-shell.tsx
   *  through controls-rail.tsx, mirroring how `plan` already reaches
   *  CodesList's access-controls dialog (P7.5-U2). */
  plan: Plan;
  onCreated: (code: QrCode, shortUrl: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"limit" | "generic" | null>(null);
  const [mintedShortUrl, setMintedShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugOpen, setSlugOpen] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [slugError, setSlugError] = useState<SlugError | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const destinationValid = validateDestination(payload).ok;
  const showingSuccess = mintedShortUrl !== null && payload === mintedShortUrl;
  const vanitySlugsLocked = !PLAN_LIMITS[plan].vanitySlugs;

  function startNaming() {
    setError(null);
    setDraftName(suggestCodeName(payload));
    setSlugOpen(false);
    setCustomSlug("");
    setSlugError(null);
    setPhase("naming");
  }

  function cancelNaming() {
    setPhase("idle");
    setDraftName("");
    setError(null);
    setSlugOpen(false);
    setCustomSlug("");
    setSlugError(null);
  }

  async function handleSubmit() {
    const name = draftName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    setSlugError(null);
    try {
      // Free plan never sends a slug, even if a stale draft is somehow
      // sitting in state (the input is disabled behind the Pro lock, so
      // this is defense-in-depth, not the primary guard).
      const slug = !vanitySlugsLocked && customSlug.trim().length > 0 ? customSlug.trim() : undefined;
      const result = await createDynamicCode({ name, destination: payload, style, slug });
      if (!result.ok) {
        if (isSlugError(result.error)) {
          setSlugError(result.error);
          return;
        }
        setError(result.error === "code_limit" ? "limit" : "generic");
        return;
      }
      const shortUrl = printedShortUrl(result.data.slug);
      setMintedShortUrl(shortUrl);
      setPhase("idle");
      setDraftName("");
      setSlugOpen(false);
      setCustomSlug("");
      onCreated(result.data, shortUrl);
    } catch {
      setError("generic");
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
    setCopied(false);
  }

  if (showingSuccess) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
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
              <Check className="size-3.5 text-primary" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Live — this is now the printed code on the artifact above.
          </p>
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
    );
  }

  if (phase === "naming") {
    return (
      <div className="flex flex-col gap-1.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") cancelNaming();
              }}
              placeholder="Code name"
              aria-label="New dynamic code name"
              maxLength={60}
              disabled={busy}
              className="h-8 flex-1"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              disabled={busy || draftName.trim().length === 0}
              aria-label="Create dynamic code"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={cancelNaming}
              disabled={busy}
              aria-label="Cancel"
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </div>

          {/* "Customize link" disclosure (P7.5-U3) — collapsed by default,
              a plain toggle button (no motion beyond the existing
              text-color token transition every other muted-foreground
              hover in this file already uses). */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              aria-expanded={slugOpen}
              onClick={() => setSlugOpen((open) => !open)}
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
                    maxLength={30}
                    disabled={busy}
                    spellCheck={false}
                    className="h-8 font-mono text-xs"
                  />
                )}
                <p className="text-[11px] leading-snug text-muted-foreground">{SLUG_HELPER_TEXT}</p>
                {slugError && (
                  <p role="alert" className="text-xs text-destructive">
                    {SLUG_ERROR_MESSAGES[slugError]}
                  </p>
                )}
              </div>
            )}
          </div>
        </form>
        {error && (
          // The limit note is an upgrade nudge (quiet, muted) — every other
          // error is a real failure (destructive-red), same distinction
          // kit-bar's limitError/actionError pair makes with two
          // separately-styled notes.
          <p role="alert" className={cn("text-xs", error === "limit" ? "text-muted-foreground" : "text-destructive")}>
            {error === "limit" ? CODE_LIMIT_MESSAGE : GENERIC_ERROR_MESSAGE}
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!destinationValid}
      onClick={startNaming}
      className="w-fit gap-1.5 text-primary hover:bg-primary/10 hover:text-primary disabled:text-muted-foreground"
    >
      Create dynamic code
    </Button>
  );
}
