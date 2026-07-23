import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matched skeleton for `/codes/[slug]` — mirrors the real page's
 * block structure (breadcrumb, header, range selector, chart, 3 stat
 * tiles, 4-column breakdown grid, recent-activity list) so the Suspense
 * swap has zero layout shift. The swap itself is instant, no cross-fade
 * (deliberate scope cut per spec).
 */
export default function Loading() {
  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
          <Skeleton className="h-3 w-32" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-56 rounded-lg" />
        </div>

        <Skeleton className="h-64 w-full rounded-xl" />

        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
