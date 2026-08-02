import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Layout-matched skeleton for `/codes` (P9.6-U2 re-match) — mirrors the real
 * page's header, one compact 4-cell stat strip, the chart card, and the
 * table block, so the Suspense swap has minimal layout shift. No min-h/bg
 * wrapper: the (app) layout owns the shell now. The table-area placeholder
 * stays one generic block rather than replicating the real page's
 * desktop-table/mobile-card split — a skeleton only needs to approximate
 * final shape, and the real split has no data-dependent height difference
 * between its two variants worth chasing here.
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
          <Skeleton className="h-8 w-32 shrink-0 rounded-lg" />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-8">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        <Skeleton className="h-96 w-full rounded-xl" />
      </main>
    </div>
  );
}
