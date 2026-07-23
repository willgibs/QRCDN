import type { QrStyle } from "@qrcdn/shared";
import type { BrandKit } from "@/app/(app)/studio/actions";
import { KitBar } from "./kit-bar";

/**
 * Trimmed to just the `KitBar` row (P6.5-U1) — the wordmark, primary nav,
 * account cluster, and sign-out that used to live here all moved up to
 * `AppNav` (components/app/app-nav.tsx), mounted once by app/(app)/layout.tsx
 * above every authenticated route instead of being re-declared per surface.
 * `userEmail` is gone from this component's props entirely (it had nothing
 * left to use it for) — see studio-shell.tsx's own doc comment for the rest
 * of that removal.
 *
 * No longer sticky, no longer a `<header>` — AppNav is the shell's one
 * sticky bar now (P6.5-U1 sticky-stacking decision); this row sits in
 * normal flow directly beneath it and scrolls away with the rest of the
 * page. Presentational — no hooks of its own, so no "use client" directive
 * (still bundled client-side transitively via studio-shell.tsx, matching
 * the product-window.tsx precedent of leaf components staying
 * directive-free).
 */
export function TopBar({
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
  return (
    <div className="border-b border-border/60 bg-background">
      <div className="mx-auto max-w-[1600px] px-4 py-3 lg:px-8">
        <KitBar
          kits={kits}
          activeKitId={activeKitId}
          currentStyle={currentStyle}
          userId={userId}
          pendingLogoFile={pendingLogoFile}
          onSwitch={onSwitch}
          onCreated={onCreated}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onDefaultChanged={onDefaultChanged}
        />
      </div>
    </div>
  );
}
