import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { ModuleMark } from "@/components/brand/magic";
import { LoginForm } from "@/components/auth/login-form";
import { QrTile } from "@/components/marketing/qr-tile";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

// P9.5-T0: distinct copy per failure mode, replacing the single `verified=0`
// flag — a broken/used-up magic link and a failed Google OAuth round-trip
// are different problems with different next steps, and lumping them into
// one generic message hid that. `/auth/confirm/actions.ts` sends
// `link_invalid`; `/auth/callback` sends `oauth_failed` (CEO-final copy).
const AUTH_ERROR_COPY: Record<string, string> = {
  link_invalid:
    "That link didn't work: it may have expired or already been used. Enter your email for a fresh one.",
  oauth_failed: "Google sign-in didn't go through. Try again, or continue with email below.",
};

// P9.5-T4: the value panel's three plain checks, right column at lg+ only.
// Static content, zero client JS — plain data, not exported (this page's
// only consumer).
const VALUE_CHECKS = [
  "Free codes never stop redirecting.",
  "No card, no trial clock.",
  "MIT open source.",
] as const;

function authErrorMessage(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? AUTH_ERROR_COPY[value] : undefined;
}

export default async function LoginPage(props: PageProps<"/login">) {
  // Dual-mode entry point: signing in and signing up are the same form
  // (signInWithOtp creates the account on first use), so an already-authed
  // visitor has nothing left to do here — send them straight to the app.
  // getClaims(), not getSession() (CLAUDE.md hard rule: never trust
  // getSession() server-side).
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect("/studio");
  }

  const params = await props.searchParams;
  const initialError = authErrorMessage(params.auth_error);

  return (
    // P9.9-C0.5: /login rides the marketing dark-only directive — visitors
    // arrive here from marketing CTAs and the HeroBackdrop glow is tuned for
    // the dark register. Same wrapper contract as (marketing)/layout.tsx.
    <div
      data-force-dark
      className="dark relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 lg:flex-row lg:justify-center lg:gap-16"
    >
      <HeroBackdrop />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <span className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </span>

        {/* CSS mount entrance, not the motion `Reveal` it replaced: Reveal
            SSRs `opacity:0` inline, so the whole sign-in card was invisible
            pre-hydration and with JS off. `.mount-enter` (globals.css) keeps
            the same entrance with keyframes-only hiding. */}
        <div className="mount-enter w-full">
          <div className="rounded-3xl bg-gradient-to-b from-primary/40 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <div className="rounded-[calc(1.5rem-1px)] bg-card/90 p-8 backdrop-blur-xl sm:p-9">
              <div className="mb-6 flex flex-col gap-1.5 text-center">
                <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Sign in or sign up
                </h1>
                <p className="text-sm text-muted-foreground">
                  One step, either way: we&apos;ll set up your account if you&apos;re new.
                </p>
              </div>
              <LoginForm initialError={initialError} />
            </div>
          </div>
        </div>

        {/* P9.5-T5 rider: hidden at lg+, where the value panel's own
            sign-off (below) already renders this same line, so showing
            both duplicated it in the same viewport. Still the only
            sign-off below lg, where the value panel is display:none. */}
        <p className="mt-8 font-mono text-xs text-muted-foreground lg:hidden">
          your code never dies
        </p>
      </div>

      {/* Value panel, lg+ only — below lg this contributes zero box
          (display:none), so the column above renders exactly today's
          single-column experience unchanged at every smaller breakpoint.
          Auth card logic/markup above is otherwise byte-identical to
          before this unit. */}
      <div className="relative hidden w-full max-w-sm flex-col gap-8 lg:flex">
        <QrTile className="w-28" />

        <ul className="flex flex-col gap-3">
          {VALUE_CHECKS.map((check) => (
            <li key={check} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {check}
            </li>
          ))}
        </ul>

        <p className="font-mono text-xs text-muted-foreground">your code never dies</p>
      </div>
    </div>
  );
}
