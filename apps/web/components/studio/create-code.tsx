"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, X } from "lucide-react";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateDestination } from "@/lib/validation";
import { suggestCodeName } from "@/lib/code-name";
import { printedShortUrl } from "@/lib/short-url";
import { createDynamicCode, type QrCode } from "@/app/(app)/studio/code-actions";

const COPY_FLASH_TIMEOUT_MS = 1600;
const CODE_LIMIT_MESSAGE = "Free includes 3 dynamic codes — Pro raises it to 250.";
const GENERIC_ERROR_MESSAGE = "Couldn't create that code — try again.";

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
  onCreated,
}: {
  payload: string;
  style: QrStyle;
  onCreated: (code: QrCode, shortUrl: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"limit" | "generic" | null>(null);
  const [mintedShortUrl, setMintedShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const destinationValid = validateDestination(payload).ok;
  const showingSuccess = mintedShortUrl !== null && payload === mintedShortUrl;

  function startNaming() {
    setError(null);
    setDraftName(suggestCodeName(payload));
    setPhase("naming");
  }

  function cancelNaming() {
    setPhase("idle");
    setDraftName("");
    setError(null);
  }

  async function handleSubmit() {
    const name = draftName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createDynamicCode({ name, destination: payload, style });
      if (!result.ok) {
        setError(result.error === "code_limit" ? "limit" : "generic");
        return;
      }
      const shortUrl = printedShortUrl(result.data.slug);
      setMintedShortUrl(shortUrl);
      setPhase("idle");
      setDraftName("");
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
          className="flex items-center gap-1.5"
        >
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
