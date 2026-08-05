"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCodeDialog } from "@/components/codes/create-code-dialog";
import { BulkCreateDialog } from "@/components/codes/bulk-create-dialog";
import type { KitPickerKit } from "@/lib/brand-kits";
import type { Plan } from "@/lib/entitlements";

/**
 * `/codes` header's two create affordances (P9.8-B2, replacing the old
 * plain link to `/studio` now that creation lives here — the studio is
 * kits-only). "Create code" owns `CreateCodeDialog`'s open state itself and
 * mounts it conditionally, per that component's own conditional-mount
 * contract (mirroring `CodeAccessDialog`'s). "Bulk create" needs no open
 * state from here at all: `BulkCreateDialog` stays self-contained — its own
 * trigger button (with its own Pro-pill lock affordance), its own `open`
 * state — unchanged in that respect by the move from the studio rail.
 */
export function CodesHeaderActions({
  kits,
  plan,
  codeCount,
}: {
  kits: KitPickerKit[];
  plan: Plan;
  codeCount: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button type="button" className="gap-1.5" onClick={() => setCreateOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
        Create code
      </Button>
      <BulkCreateDialog kits={kits} plan={plan} codeCount={codeCount} />
      {createOpen && (
        <CreateCodeDialog open onOpenChange={setCreateOpen} kits={kits} plan={plan} />
      )}
    </div>
  );
}
