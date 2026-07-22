"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, Star, Trash2, X } from "lucide-react";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createBrandKit,
  deleteBrandKit,
  setDefaultBrandKit,
  type BrandKit,
} from "@/app/(app)/studio/actions";

const DELETE_CONFIRM_TIMEOUT_MS = 4000;
const LIMIT_NOTE_TIMEOUT_MS = 6000;

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
  onSwitch,
  onCreated,
  onDeleted,
  onDefaultChanged,
}: {
  kits: BrandKit[];
  activeKitId: string | null;
  currentStyle: QrStyle;
  onSwitch: (kit: BrandKit) => void;
  onCreated: (kit: BrandKit) => void;
  onDeleted: (id: string) => void;
  onDefaultChanged: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      if (limitTimer.current) clearTimeout(limitTimer.current);
    },
    [],
  );

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

  async function handleCreate() {
    const name = draftName.trim();
    if (!name || busyId) return;
    setBusyId("create");
    const result = await createBrandKit({ name, style: currentStyle });
    setBusyId(null);
    if (!result.ok) {
      if (result.error === "kit_limit") showLimitError();
      return;
    }
    onCreated(result.data);
    setCreating(false);
    setDraftName("");
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
              </button>
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
