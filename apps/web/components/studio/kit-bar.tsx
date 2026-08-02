"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleMark } from "@/components/brand/magic";
import { createClient } from "@/lib/supabase/client";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { stylesEqual } from "@/lib/style-compare";
import { cn } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/entitlements";
import {
  createBrandKit,
  deleteBrandKit,
  setDefaultBrandKit,
  updateBrandKit,
} from "@/app/(app)/studio/actions";
import type { BrandKit } from "@/lib/brand-kits";

const DELETE_CONFIRM_TIMEOUT_MS = 4000;
const LIMIT_NOTE_TIMEOUT_MS = 6000;
const SAVED_FLASH_TIMEOUT_MS = 1600;
const ACTION_ERROR_TIMEOUT_MS = 6000;

type Mode = "idle" | "creating" | "renaming";

/**
 * Best-effort upload of a pending logo File to the durable `brand-logos`
 * bucket at the kit's canonical path (p4-studio.md: `{owner_id}/{kit_id}`,
 * exactly that, extensionless — `deleteBrandKit` cleans up this literal
 * path). Never blocks kit create/save on failure: `style.logo.assetId`
 * already carries the data URI the preview and every future render use, so
 * a failed bucket upload only means the durable copy is missing, not that
 * the kit itself is broken.
 */
async function uploadPendingLogo(userId: string, kitId: string, file: File): Promise<void> {
  const supabase = createClient();
  const path = `${userId}/${kitId}`;
  const { error } = await supabase.storage
    .from("brand-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error("brand-logos upload failed for", path, error);
  }
}

/** A kit's ink color for its ModuleMark tint — a corrupted/unparseable
 *  snapshot falls back to a neutral ink rather than crashing the menu
 *  (mirrors studio-shell's own styleFromKit fallback philosophy). */
function kitInkHex(kit: BrandKit): string {
  try {
    return inkHexFromStyle(parseQrStyle(kit.style));
  } catch {
    return "#111111";
  }
}

/** ModuleMark tinted via `currentColor`, driven by an inline `color` on the
 *  wrapping span — the glyph itself never takes a color prop directly. */
function TintedModuleMark({ hex, className }: { hex: string; className?: string }) {
  return (
    <span aria-hidden style={{ color: hex }} className="inline-flex shrink-0">
      <ModuleMark className={className ?? "size-3"} />
    </span>
  );
}

/**
 * Founder round-3 note 1: the pill itself dropped its unlabeled status dots
 * (default / unsaved-changes) entirely — every state now has to be either
 * labeled or self-evident. The unsaved-changes signal moves here: this
 * button IS the state, not just the action that clears it. Its idle
 * ("ready to save") state carries its own small amber dot *inside* a
 * button already labeled "Save changes" — self-labeling, never a bare
 * colored dot loose on the page — plus a `title` tooltip spelling out what
 * the dot means for anyone who pauses on it.
 */
function SaveButton({
  busy,
  saved,
  onClick,
}: {
  busy: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  const idle = !busy && !saved;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={onClick}
      aria-label={busy ? "Saving" : saved ? "Saved" : "Save changes"}
      title={idle ? "You have unsaved style changes" : undefined}
      className="gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : saved ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <>
          <Save className="size-3.5" aria-hidden />
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber-500" />
        </>
      )}
      {busy ? "Saving" : saved ? "Saved" : "Save changes"}
    </Button>
  );
}

export function KitBar({
  kits,
  activeKitId,
  currentStyle,
  userId,
  pendingLogoFile,
  onSwitch,
  onCreated,
  onSaved,
  onDeleted,
  onDefaultChanged,
}: {
  kits: BrandKit[];
  activeKitId: string | null;
  currentStyle: QrStyle;
  userId: string;
  pendingLogoFile: File | null;
  onSwitch: (kit: BrandKit) => void;
  onCreated: (kit: BrandKit) => void;
  onSaved: (kit: BrandKit) => void;
  onDeleted: (id: string) => void;
  onDefaultChanged: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      if (limitTimer.current) clearTimeout(limitTimer.current);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
      if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    },
    [],
  );

  // The active kit's own saved style, deep-compared against the working
  // `currentStyle` to drive the unsaved-changes indicator + Save action
  // (P4-U3 deliverable #4). A corrupted/unparseable snapshot is treated as
  // "differs" so Save can overwrite it — mirrors studio-shell's own
  // styleFromKit fallback philosophy.
  const activeKit = kits.find((k) => k.id === activeKitId) ?? null;
  const hasUnsavedChanges = useMemo(() => {
    if (!activeKit) return false;
    try {
      return !stylesEqual(currentStyle, parseQrStyle(activeKit.style));
    } catch {
      return true;
    }
  }, [activeKit, currentStyle]);

  // The pill's own ModuleMark tint reflects the *live working* style, not
  // the saved kit snapshot — it re-hues as the user edits ink, matching
  // ArtifactStage's own "your brand, everywhere" glow re-hue.
  const liveInkHex = inkHexFromStyle(currentStyle);

  function armDeleteConfirm(id: string) {
    setConfirmDeleteId(id);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => setConfirmDeleteId(null), DELETE_CONFIRM_TIMEOUT_MS);
  }

  function showLimitError() {
    setLimitError(true);
    if (limitTimer.current) clearTimeout(limitTimer.current);
    limitTimer.current = setTimeout(() => setLimitError(false), LIMIT_NOTE_TIMEOUT_MS);
  }

  function flashSaved(id: string) {
    setSavedFlashId(id);
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
    savedFlashTimer.current = setTimeout(() => setSavedFlashId(null), SAVED_FLASH_TIMEOUT_MS);
  }

  function showActionError(message: string) {
    setActionError(message);
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    actionErrorTimer.current = setTimeout(() => setActionError(null), ACTION_ERROR_TIMEOUT_MS);
  }

  function startCreating() {
    setDraftName("");
    setMode("creating");
  }

  function startRenaming(kit: BrandKit) {
    setDraftName(kit.name);
    setMode("renaming");
  }

  function cancelDraft() {
    setMode("idle");
    setDraftName("");
  }

  // Every handler below wraps its server-action call in try/finally: the
  // action functions themselves never throw (they return an ActionResult —
  // apps/web/lib/validation.ts), but the *invocation* can still reject at
  // the network/framework layer (dropped connection, a request-size limit,
  // an expired session) — without the finally, `busyId` would stay set
  // forever and the affected control would show a permanent spinner
  // (P4-U4 red-team finding).
  async function handleCreate() {
    const name = draftName.trim();
    if (!name || busyId) return;
    setBusyId("create");
    try {
      const result = await createBrandKit({ name, style: currentStyle });
      if (!result.ok) {
        if (result.error === "kit_limit") {
          showLimitError();
        } else {
          showActionError("Couldn't create that kit. Try again.");
        }
        return;
      }
      if (pendingLogoFile) {
        await uploadPendingLogo(userId, result.data.id, pendingLogoFile);
      }
      onCreated(result.data);
      cancelDraft();
    } catch {
      showActionError("Couldn't create that kit. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRename(id: string) {
    const name = draftName.trim();
    if (!name || busyId) return;
    setBusyId(id);
    try {
      const result = await updateBrandKit(id, { name });
      if (!result.ok) {
        showActionError("Couldn't rename that kit. Try again.");
        return;
      }
      onSaved(result.data);
      cancelDraft();
    } catch {
      showActionError("Couldn't rename that kit. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSave(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      if (pendingLogoFile) {
        await uploadPendingLogo(userId, id, pendingLogoFile);
      }
      const result = await updateBrandKit(id, { style: currentStyle });
      if (!result.ok) {
        showActionError("Couldn't save that kit. Try again.");
        return;
      }
      onSaved(result.data);
      flashSaved(id);
    } catch {
      showActionError("Couldn't save that kit. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      armDeleteConfirm(id);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setConfirmDeleteId(null);
    setBusyId(id);
    try {
      const result = await deleteBrandKit(id);
      if (result.ok) {
        onDeleted(id);
      } else {
        showActionError("Couldn't delete that kit. Try again.");
      }
    } catch {
      showActionError("Couldn't delete that kit. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    try {
      const result = await setDefaultBrandKit(id);
      if (result.ok) {
        onDefaultChanged(id);
      } else {
        showActionError("Couldn't set that kit as default. Try again.");
      }
    } catch {
      showActionError("Couldn't set that kit as default. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  function handleDraftSubmit() {
    if (mode === "creating") {
      handleCreate();
    } else if (mode === "renaming" && activeKit) {
      handleRename(activeKit.id);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      {mode !== "idle" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDraftSubmit();
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancelDraft();
            }}
            placeholder={mode === "creating" ? "Kit name" : undefined}
            aria-label={mode === "creating" ? "New kit name" : "Rename kit"}
            maxLength={60}
            disabled={busyId !== null}
            className="h-8 w-36"
          />
          <Button
            type="submit"
            size="icon-sm"
            variant="ghost"
            disabled={busyId !== null || draftName.trim().length === 0}
            aria-label={mode === "creating" ? "Create kit" : "Save name"}
          >
            {busyId !== null ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={cancelDraft} aria-label="Cancel">
            <X />
          </Button>
        </form>
      ) : kits.length > 0 && activeKit ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-full border border-border/60 bg-muted/40 pr-2.5 pl-2 text-sm text-foreground outline-none transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-muted"
              >
                <TintedModuleMark hex={liveInkHex} />
                <span className="max-w-[9rem] truncate">{activeKit.name}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {kits.map((kit) => (
                <DropdownMenuItem key={kit.id} onSelect={() => onSwitch(kit)} className="gap-2">
                  <TintedModuleMark hex={kitInkHex(kit)} />
                  <span className="flex-1 truncate">{kit.name}</span>
                  {/* Default-ness lives only here now (round-3 note 1) — a
                   *  quiet mono micro-tag, never a bare dot. Independent of
                   *  the active-kit check: a kit can be default without
                   *  being the one currently open, or both at once. */}
                  {kit.is_default && (
                    <span className="shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                      Default
                    </span>
                  )}
                  {kit.id === activeKitId && (
                    <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => startRenaming(activeKit)} className="gap-2">
                <Pencil className="size-3.5" aria-hidden />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={activeKit.is_default}
                onSelect={() => handleSetDefault(activeKit.id)}
                className="gap-2"
              >
                <Star className={cn("size-3.5", activeKit.is_default && "fill-current text-primary")} aria-hidden />
                {activeKit.is_default ? "Default kit" : "Set as default"}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={busyId === activeKit.id}
                onSelect={(e) => {
                  if (confirmDeleteId !== activeKit.id) e.preventDefault();
                  handleDelete(activeKit.id);
                }}
                className="gap-2"
              >
                <Trash2 className="size-3.5" aria-hidden />
                {confirmDeleteId === activeKit.id ? "Confirm delete" : "Delete kit"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={startCreating} className="gap-2">
                <Plus className="size-3.5" aria-hidden />
                New kit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {hasUnsavedChanges && (
            <SaveButton
              busy={busyId === activeKit.id}
              saved={savedFlashId === activeKit.id}
              onClick={() => handleSave(activeKit.id)}
            />
          )}
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full border-dashed"
          onClick={startCreating}
        >
          <Plus className="size-3.5" />
          New kit
        </Button>
      )}

      {limitError && (
        <div
          role="alert"
          className="absolute top-full left-0 z-10 mt-2 w-56 rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md"
        >
          {/* P9.5-T8 item 5: was a hardcoded "1" duplicating
              PLAN_LIMITS.free.brandKits (CLAUDE.md's entitlements-live-in-
              one-place hard rule) — this file didn't import entitlements.ts
              at all before this fix. */}
          Free includes {PLAN_LIMITS.free.brandKits} brand kit. Pro removes the wait.
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="absolute top-full left-0 z-10 mt-2 w-56 rounded-lg border border-destructive/25 bg-popover px-3 py-2 text-xs text-destructive shadow-md"
        >
          {actionError}
        </div>
      )}
    </div>
  );
}
