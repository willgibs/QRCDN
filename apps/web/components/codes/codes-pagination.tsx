"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withQueryParam } from "@/lib/utils";

/**
 * `/codes` table pagination (P9.6-U2 follow-up) — URL-driven via `?page=`,
 * matching the `range` control's own idiom (a plain `<Link>` per step, a
 * server refetch by navigation, no client-side page-slicing machinery).
 * `resolveCodesPage`/`pageSliceFor` (lib/pagination.ts) do the actual
 * clamping/slicing server-side; this component only renders Prev/Next plus
 * the current position and never renders at all when everything already
 * fits on one page (`totalPages <= 1` — true for every free-plan account,
 * capped at 3 dynamic codes, and most Pro accounts too).
 *
 * Prev/Next rather than a numbered page list: up to 10 pages at Pro's
 * 250-code ceiling (CODES_PAGE_SIZE=25) is little enough that "which page
 * am I on" fits in one small mono readout, and it avoids a second
 * responsive-layout problem (a 10-wide number strip doesn't fit a phone).
 *
 * `useSearchParams()` needs no `<Suspense>` wrapper — see RangeSelector's
 * own doc comment for why (`/codes` is force-dynamic, D9).
 */
export function CodesPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return null;
  }

  const prevHref = page > 1 ? withQueryParam(searchParams, "page", page - 1) : null;
  const nextHref = page < totalPages ? withQueryParam(searchParams, "page", page + 1) : null;

  return (
    <nav aria-label="Codes pages" className="flex items-center justify-between gap-3">
      {prevHref ? (
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>
            <ChevronLeft aria-hidden className="size-3.5" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft aria-hidden className="size-3.5" />
          Previous
        </Button>
      )}

      <span className="font-mono text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      {nextHref ? (
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>
            Next
            <ChevronRight aria-hidden className="size-3.5" />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
          <ChevronRight aria-hidden className="size-3.5" />
        </Button>
      )}
    </nav>
  );
}
