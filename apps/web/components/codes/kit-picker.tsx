"use client";

import { useId } from "react";
import { parseQrStyle } from "@qrcdn/shared";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleMark } from "@/components/brand/magic";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import type { KitPickerKit } from "@/lib/brand-kits";

/** A kit's ink color for its ModuleMark tint — a corrupted/unparseable
 *  snapshot falls back to a neutral ink rather than crashing the picker.
 *  Duplicated from kit-bar.tsx's own `kitInkHex` (not imported: that helper
 *  isn't exported there, and it's three lines — cheaper to keep two small
 *  copies in sync than to widen kit-bar.tsx's exports for one caller). */
function kitInkHex(kit: KitPickerKit): string {
  try {
    return inkHexFromStyle(parseQrStyle(kit.style));
  } catch {
    return "#111111";
  }
}

/** ModuleMark tinted via `currentColor` — same construction as kit-bar.tsx's
 *  own `TintedModuleMark`, duplicated for the same reason as `kitInkHex`
 *  above. */
function TintedModuleMark({ hex }: { hex: string }) {
  return (
    <span aria-hidden style={{ color: hex }} className="inline-flex shrink-0">
      <ModuleMark className="size-3" />
    </span>
  );
}

/** The default kit if one exists, else the first kit, else `null` — the
 *  preselection both CreateCodeDialog and BulkCreateDialog use so a fresh
 *  dialog session starts on the same kit KitBar itself would show first. */
export function defaultKitId(kits: KitPickerKit[]): string | null {
  return kits.find((k) => k.is_default)?.id ?? kits[0]?.id ?? null;
}

/**
 * Kit picker (P9.8-B2) — shared between `create-code-dialog.tsx` and
 * `bulk-create-dialog.tsx`, both of which mint codes attached to a kit under
 * hard sync (P9.8-B1, D5 as amended): the server reads the SELECTED kit's
 * saved style; the client never sends one. Visual borrowed from
 * `kit-bar.tsx`'s own switcher dropdown (ink-tinted `ModuleMark` + name +
 * a "Default" tag), rebuilt on the vendored `Select` instead of a
 * `DropdownMenu` since this is a plain field in a form, not a switcher.
 *
 * Renders nothing when the caller has zero kits — the caller (both dialogs)
 * checks that case itself to disable submission and explain why, the same
 * "every code attaches to one" messaging `create-code.tsx`'s
 * `CreateCodeControl` already established.
 */
export function KitPicker({
  kits,
  selectedKitId,
  onChange,
  disabled,
}: {
  kits: KitPickerKit[];
  selectedKitId: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const selectId = useId();

  if (kits.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId}>Brand kit</Label>
      <Select value={selectedKitId ?? undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={selectId} className="w-full">
          <SelectValue placeholder="Choose a kit" />
        </SelectTrigger>
        <SelectContent>
          {kits.map((kit) => (
            <SelectItem key={kit.id} value={kit.id}>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <TintedModuleMark hex={kitInkHex(kit)} />
                <span className="min-w-0 flex-1 truncate">{kit.name}</span>
                {kit.is_default && (
                  <span className="shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                    Default
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
