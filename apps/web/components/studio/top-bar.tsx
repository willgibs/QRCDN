import Link from "next/link";
import type { QrStyle } from "@qrcdn/shared";
import { Button } from "@/components/ui/button";
import { ModuleMark } from "@/components/explore/magic";
import { signOutAction, type BrandKit } from "@/app/(app)/studio/actions";
import { KitBar } from "./kit-bar";

/**
 * Presentational — no hooks of its own, so no "use client" directive (it's
 * still bundled client-side transitively via studio-shell.tsx, matching the
 * product-window.tsx precedent of leaf components staying directive-free).
 * Order utilities decouple visual layout from DOM/tab order: wordmark, then
 * account cluster, then the kit bar wrap onto their own row on mobile; all
 * three sit on one row from lg up.
 */
export function TopBar({
  kits,
  activeKitId,
  currentStyle,
  userId,
  userEmail,
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
  userEmail: string;
  pendingLogoFile: File | null;
  onSwitch: (kit: BrandKit) => void;
  onCreated: (kit: BrandKit) => void;
  onSaved: (kit: BrandKit) => void;
  onDeleted: (id: string) => void;
  onDefaultChanged: (id: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:flex-nowrap lg:px-8">
        <Link
          href="/"
          className="order-1 flex shrink-0 items-center gap-2.5 font-display text-lg font-bold tracking-tight"
        >
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </Link>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-3 lg:order-3 lg:ml-0">
          {userEmail && (
            <span
              className="hidden max-w-[180px] truncate font-mono text-xs text-muted-foreground sm:inline"
              title={userEmail}
            >
              {userEmail}
            </span>
          )}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>

        <div className="order-3 w-full min-w-0 lg:order-2 lg:w-auto lg:flex-1">
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
    </header>
  );
}
