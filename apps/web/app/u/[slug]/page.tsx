import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { ModuleMark } from "@/components/brand/magic";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Code unavailable",
  robots: { index: false },
};

// The redirect Worker sends FOUR indistinguishable states here (paused,
// archived/non-active, never-existed, Supabase-unreachable) with no
// discriminating query param — see workers/redirect/src/redirect-decision.ts.
// This page can't and mustn't tell them apart: no data fetching, no
// Supabase import, no cookies/headers. An unauthenticated lookup would be
// RLS-blocked anyway, and even attempting one would turn this URL into an
// existence-probing oracle. Zero dynamic APIs also means Next statically
// renders + caches this per slug by default (do not add force-dynamic).

// No known slugs at build time — an empty return (not omitting the export)
// is what tells Next to statically render each slug on-demand at first
// visit and cache it, rather than falling back to per-request dynamic
// rendering (the `ƒ` build-output category this route must avoid).
export async function generateStaticParams() {
  return [];
}

// The route segment matches any string, not just real 4–17 char slugs — a
// `/u/<garbage-1000-chars>` hit must not blow up the layout.
const MAX_SLUG_CHARS = 64;

function truncateSlug(slug: string): string {
  return slug.length > MAX_SLUG_CHARS ? `${slug.slice(0, MAX_SLUG_CHARS)}…` : slug;
}

export default async function UnclaimedSlugPage(props: PageProps<"/u/[slug]">) {
  const { slug } = await props.params;
  const displaySlug = truncateSlug(slug);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <HeroBackdrop />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <span className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>

        <div className="w-full rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
          <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 text-center backdrop-blur-xl sm:p-9">
            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                This code isn&apos;t live right now.
              </h1>
              <p className="text-sm text-muted-foreground">
                The person who printed it may have paused it, or it hasn&apos;t
                been claimed yet.
              </p>
            </div>

            <p className="mb-6 break-all font-mono text-[11px] text-muted-foreground/70">
              /u/{displaySlug}
            </p>

            <Button asChild className="w-full">
              <Link href="/login">Create a code that never dies</Link>
            </Button>
          </div>
        </div>

        <p className="mt-8 font-mono text-xs text-muted-foreground">
          your code never dies
        </p>
      </div>
    </div>
  );
}
