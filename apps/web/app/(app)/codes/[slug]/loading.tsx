import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matched skeleton for `/codes/[slug]` (re-matched at P9.6-U3 to the
 * page's real post-rebuild structure: a back link, header, then a two-
 * column artifact/identity + actions/analysis layout collapsing to one
 * column below `md` — the same breakpoint the real page's grid uses). The
 * pre-U3 version reserved a breadcrumb line the real page never actually
 * rendered; this one's back-link skeleton corresponds to a real `<Link
 * href="/codes">` the page now has. The swap itself is instant, no
 * cross-fade (deliberate scope cut per spec, unchanged from pre-U3).
 */
export default function Loading() {
  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
          <Skeleton className="h-3 w-16" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid grid-cols-1 max-w-[1600px] gap-10 px-4 py-8 md:grid-cols-[320px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        {/* Left: artifact + identity + stat tiles (P9.6-U3 review round 1
            moved Scans/Peak day/Today so far here, out of the right
            column, to fill this rail's dead space). */}
        <div className="flex flex-col gap-6">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        {/* Right: actions + analysis */}
        <div className="flex flex-col gap-8">
          <Skeleton className="h-24 w-full rounded-xl" />

          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-56 rounded-lg" />
            </div>

            <Skeleton className="h-64 w-full rounded-xl" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
          </div>
        </div>
      </main>
    </div>
  );
}
