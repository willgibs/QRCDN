"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Save, Star, Trash2, X } from "lucide-react";
import { parseQrStyle, type QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { stylesEqual } from "@/lib/style-compare";
import { cn } from "@/lib/utils";
import {
  createBrandKit,
  deleteBrandKit,
  setDefaultBrandKit,
  updateBrandKit,
  type BrandKit,
} from "@/app/(app)/studio/actions";

const DELETE_CONFIRM_TIMEOUT_MS = 4000;
const LIMIT_NOTE_TIMEOUT_MS = 6000;
const SAVED_FLASH_TIMEOUT_MS = 1600;

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

/** 2x2 module quadrant, recolored to the --qr-fg/--qr-bg bridge tokens —
 *  same decorative stand-in the approved StudioWindow mockup uses for every
 *  kit row (not per-kit color, deliberately, to match that reference). */
function MiniSwatch() {
  return (
    <span
      aria-hidden
      className="grid size-4 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 rounded-[3px] bg-qr-fg p-0.5"
    >
      <span className="rounded-[1px] bg-qr-bg" />
      <span className="rounded-[1px] bg-qr-bg/50" />
      <span className="rounded-[1px] bg-qr-bg/50" />
      <span className="rounded-[1px] bg-qr-bg" />
    </span>
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
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);

  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      if (limitTimer.current) clearTimeout(limitTimer.current);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
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

  async function handleCreate() {
    const name = draftName.trim();
    if (!name || busyId) return;
    setBusyId("create");
    const result = await createBrandKit({ name, style: currentStyle });
    if (!result.ok) {
      setBusyId(null);
      if (result.error === "kit_limit") showLimitError();
      return;
    }
    if (pendingLogoFile) {
      await uploadPendingLogo(userId, result.data.id, pendingLogoFile);
    }
    setBusyId(null);
    onCreated(result.data);
    setCreating(false);
    setDraftName("");
  }

  async function handleSave(id: string) {
    if (busyId) return;
    setBusyId(id);
    if (pendingLogoFile) {
      await uploadPendingLogo(userId, id, pendingLogoFile);
    }
    const result = await updateBrandKit(id, { style: currentStyle });
    setBusyId(null);
    if (!result.ok) return;
    onSaved(result.data);
    flashSaved(id);
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      armDeleteConfirm(id);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setConfirmDeleteId(null);
    setBusyId(id);
    const result = await deleteBrandKit(id);
    setBusyId(null);
    if (result.ok) onDeleted(id);
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    const result = await setDefaultBrandKit(id);
    setBusyId(null);
    if (result.ok) onDefaultChanged(id);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {kits.map((kit) => {
          const isActive = kit.id === activeKitId;
          return (
            <div
              key={kit.id}
              className={cn(
                "flex shrink-0 items-center gap-0.5 rounded-full",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onSwitch(kit)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1.5 pr-3 pl-2.5 text-sm transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
                  !isActive && "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <MiniSwatch />
                <span className="max-w-[8rem] truncate">{kit.name}</span>
                {kit.is_default && (
                  <span
                    aria-hidden
                    title="Default kit"
                    className="size-1.5 shrink-0 rounded-full bg-primary"
                  />
                )}
                {isActive && hasUnsavedChanges && (
                  <span
                    aria-hidden
                    title="Unsaved changes"
                    className="size-1.5 shrink-0 rounded-full bg-amber-500"
                  />
                )}
              </button>
              {isActive && (hasUnsavedChanges || savedFlashId === kit.id) && (
                <button
                  type="button"
                  title={savedFlashId === kit.id ? "Saved" : "Save to kit"}
                  aria-label={savedFlashId === kit.id ? "Saved" : "Save to kit"}
                  disabled={busyId === kit.id}
                  onClick={() => handleSave(kit.id)}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                    savedFlashId === kit.id && "text-primary",
                  )}
                >
                  {busyId === kit.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : savedFlashId === kit.id ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                </button>
              )}
              {isActive && (
                <>
                  <button
                    type="button"
                    title={kit.is_default ? "Default kit" : "Set as default"}
                    aria-label={kit.is_default ? "Default kit" : "Set as default"}
                    disabled={kit.is_default || busyId === kit.id}
                    onClick={() => handleSetDefault(kit.id)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Star className={cn("size-3.5", kit.is_default && "fill-current text-primary")} />
                  </button>
                  <button
                    type="button"
                    title={confirmDeleteId === kit.id ? "Confirm delete" : "Delete kit"}
                    aria-label={confirmDeleteId === kit.id ? "Confirm delete" : "Delete kit"}
                    disabled={busyId === kit.id}
                    onClick={() => handleDelete(kit.id)}
                    className={cn(
                      "mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-40",
                      confirmDeleteId === kit.id && "bg-destructive/10 text-destructive",
                    )}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="relative shrink-0">
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex items-center gap-1.5"
          >
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCreating(false);
                  setDraftName("");
                }
              }}
              placeholder="Kit name"
              aria-label="New kit name"
              maxLength={60}
              disabled={busyId === "create"}
              className="h-8 w-32"
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              disabled={busyId === "create" || draftName.trim().length === 0}
              aria-label="Create kit"
            >
              <Check />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setDraftName("");
              }}
              aria-label="Cancel new kit"
            >
              <X />
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full border-dashed"
            onClick={() => setCreating(true)}
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
            Free includes 1 brand kit — Pro removes the wait.
          </div>
        )}
      </div>
    </div>
  );
}
