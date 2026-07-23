import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matched skeleton for `/codes` — mirrors the real page's header +
 * 3 stat tiles + table block so the Suspense swap has zero layout shift.
 */
export default function Loading() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </main>
    </div>
  );
}
