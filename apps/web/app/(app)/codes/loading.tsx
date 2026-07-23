import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matched skeleton for `/codes` — mirrors the real page's header +
 * 3 stat tiles + global scan-activity panel + table block so the Suspense
 * swap has zero layout shift. No min-h/bg wrapper: the (app) layout owns
 * the shell now.
 */
export default function Loading() {
  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </main>
    </div>
  );
}
