"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KitPicker, defaultKitId } from "@/components/codes/kit-picker";
import { attachCodeKit } from "@/app/(app)/studio/code-actions";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import type { KitPickerKit } from "@/lib/brand-kits";

const GENERIC_ERROR = "Couldn't change the kit. Try again.";

// Same actionable-copy contract as code-access-dialog.tsx's ERROR_COPY: a
// validation failure must not read like a transient one.
const ERROR_COPY: Record<string, string> = {
  brand_kit_not_found: "That kit no longer exists. Refresh and pick another.",
  invalid_style: "That kit's saved design didn't parse. Open it in the studio and save it again.",
  not_found: "That code no longer exists. Refresh and try again.",
  rate_limited: "Too many changes just now. Try again in a few minutes.",
};

function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? GENERIC_ERROR;
}

/**
 * The "Brand kit" item on the code detail page (P9.8-R1, board-review
 * finding: hard sync made kits the versioning mechanism, but the detail page
 * never even NAMED a code's kit, and nothing let you attach or change one
 * after creation — pre-P9.8 rows and explicit-style API creations were
 * stranded kit-less).
 *
 * Semantics shown here are exactly D5-as-amended: attached codes mirror
 * their kit (change = adopt the new kit's design now and follow its future
 * saves); kit-less codes are frozen snapshots until someone attaches one.
 * There is deliberately no detach affordance: kits are the versioning
 * mechanism, so preserving a look means keeping the kit that has it.
 */
export function CodeKitControl({
  code,
  kits,
}: {
  code: DynamicCodeSummary;
  kits: KitPickerKit[];
}) {
  const [open, setOpen] = useState(false);

  const attachedKit = code.brandKitId ? (kits.find((k) => k.id === code.brandKitId) ?? null) : null;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        Brand kit
      </p>
      <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
        {attachedKit ? (
          <span className="min-w-0 truncate text-sm text-foreground">{attachedKit.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">None: frozen design</span>
        )}
        {kits.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            {attachedKit ? "Change" : "Attach"}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/studio">Create a kit</Link>
          </Button>
        )}
      </div>
      {!attachedKit && (
        <p className="mt-1 text-xs text-muted-foreground">
          This code keeps the exact design it was created with. Attach a kit and it follows that
          kit&apos;s design from then on.
        </p>
      )}
      {/* Conditional mount (CodeAccessDialog convention): the dialog's state
          resets by construction every time it opens. */}
      {open && (
        <CodeKitDialog
          code={code}
          kits={kits}
          currentKitId={attachedKit?.id ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function CodeKitDialog({
  code,
  kits,
  currentKitId,
  onClose,
}: {
  code: DynamicCodeSummary;
  kits: KitPickerKit[];
  currentKitId: string | null;
  onClose: () => void;
}) {
  const [selectedKitId, setSelectedKitId] = useState<string | null>(
    currentKitId ?? defaultKitId(kits),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!selectedKitId || pending) return;
    setPending(true);
    setError(null);
    const result = await attachCodeKit(code.id, selectedKitId);
    if (!result.ok) {
      setError(errorCopy(result.error));
      setPending(false);
      return;
    }
    // Full reload, not a client-router refresh: the artifact, its paper mat,
    // and the kit row above are all server-rendered from the updated style.
    // router.refresh() and four other in-place mechanisms are documented
    // failures in this codebase (pause-toggle-button.tsx's standing note;
    // B2's dialogs made it five) — the hard reload is the proven mechanism.
    window.location.reload();
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Brand kit</DialogTitle>
          <DialogDescription>
            {currentKitId
              ? "This code follows its kit. Pick a different one and it adopts that design now, then follows that kit's future saves."
              : "Attach a kit and this code adopts its design now, then follows the kit's future saves. Its short link never changes."}
          </DialogDescription>
        </DialogHeader>
        <KitPicker
          kits={kits}
          selectedKitId={selectedKitId}
          onChange={setSelectedKitId}
          disabled={pending}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !selectedKitId || selectedKitId === currentKitId}
            onClick={handleApply}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            {pending ? "Applying" : "Apply kit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
