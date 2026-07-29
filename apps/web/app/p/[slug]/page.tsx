import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeroBackdrop } from "@/components/explore/backdrop";
import { ModuleMark } from "@/components/brand/magic";
import { UnlockForm } from "./unlock-form";

// P7.5-U2: the password wall a protected scan lands on (Worker routes here
// per redirect-decision.ts's `{kind: "password"}` branch — see
// workers/redirect/src/redirect-decision.ts, P7.5-U1). Unlike /u/[slug]
// (app/u/[slug]/page.tsx), which is deliberately static/zero-lookup so it
// can never become an existence-probing oracle, THIS page's whole job is a
// scoped lookup — a caller reaching /p/{slug} already knows from the QR
// code itself that the slug exists and is protected, so there's no
// additional disclosure risk in confirming that here. force-dynamic because
// every request needs a fresh Postgres read (status/expiry/password can
// change at any time) — never cached.
//
// createAdminClient(), never the RLS-scoped client from lib/supabase/
// server.ts: there is no session on this route (no login, no cookie
// identity) — this is a public, unauthenticated lookup by design, the same
// posture actions.ts's verifyCodeAccess documents at its own file header.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Password required",
  // Unlock pages shouldn't index — same reasoning as /u/[slug]'s own
  // metadata (a slug-shaped URL has nothing worth surfacing in search).
  robots: { index: false },
};

const MAX_SLUG_CHARS = 64;

function truncateSlug(slug: string): string {
  return slug.length > MAX_SLUG_CHARS ? `${slug.slice(0, MAX_SLUG_CHARS)}…` : slug;
}

export default async function PasswordGatePage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  // qr_codes.slug is upper(slug)-constrained (D12) and the Worker matches
  // case-insensitively (workers/redirect/src/slug.ts's toSlugUpper) — every
  // lookup normalizes to uppercase before hitting Postgres, same convention.
  const up = slug.toUpperCase();

  const db = createAdminClient();
  const { data, error } = await db
    .from("qr_codes")
    .select("destination_url, status, expires_at, password_hash")
    .eq("slug", up)
    .eq("kind", "dynamic")
    .maybeSingle();

  const expired = Boolean(data?.expires_at) && new Date() >= new Date(data!.expires_at!);

  // Not-found, non-active, or expired all read the same way /u/[slug]
  // already does for every other "this code isn't live" case — sending them
  // there instead of duplicating that page's copy/markup here.
  if (error || !data || data.status !== "active" || expired) {
    redirect(`/u/${up}`);
  }

  if (data.password_hash === null) {
    // Fail-open: reachable when the Worker's KV cache still has
    // passwordProtected: true (stale, up to ~5min per D2's backfill TTL)
    // for a code whose password was just removed in Postgres. "Your code
    // never dies" (CLAUDE.md hard rule) means a stale cache must never turn
    // a live, unprotected code into a dead end — sending the scanner
    // straight to their destination is correct here, not a leak: Postgres
    // truth already says this code has no password.
    redirect(data.destination_url ?? `/u/${up}`);
  }

  const displaySlug = truncateSlug(up);

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
                This code is password-protected.
              </h1>
              <p className="text-sm text-muted-foreground">Enter the password to continue.</p>
            </div>

            <p className="mb-6 break-all font-mono text-[11px] text-muted-foreground/70">/p/{displaySlug}</p>

            <UnlockForm slug={up} />
          </div>
        </div>

        <p className="mt-8 font-mono text-xs text-muted-foreground">your code never dies</p>
      </div>
    </div>
  );
}
