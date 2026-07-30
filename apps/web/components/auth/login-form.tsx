"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { EASE_OUT } from "@/components/brand/magic";

/** Standard Google "G" mark — official brand colors, as required for
 *  "Continue with Google" buttons per Google's own sign-in branding guidelines. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className ?? "size-4"}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.78l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// P8-U5: Turnstile (D14 abuse control on sign-in). Supabase Auth verifies
// the token natively, server-side (Project Settings -> Auth -> Bot and
// Abuse Protection) — there is no siteverify endpoint of our own to write.
// This file's whole job is: load the widget, capture its token, forward it
// as signInWithOtp's options.captchaToken. `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
// is inlined at build time (same idiom as instrumentation-client.ts's
// NEXT_PUBLIC_SENTRY_DSN) — unset collapses every conditional below to dead
// code the bundler strips: no script tag, no widget container, no gating
// on the submit button. This is the default state today (no Cloudflare
// Turnstile site exists yet, the board provisions one later) and must
// render byte-identical to the pre-P8-U5 form. Google OAuth (handleGoogle
// below) is deliberately untouched — out of scope (redirect flow, Google's
// own bot controls).
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Pending = "email" | "google" | null;

export function LoginForm({ initialError }: { initialError?: string }) {
  const emailId = useId();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  // Turnstile — every piece of state below stays at its initial value (and
  // the effect below is a permanent no-op) when TURNSTILE_SITE_KEY is
  // unset, since nothing ever flips scriptLoaded true with no <Script> in
  // the tree to load it.
  const turnstileRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Renders the widget once the script has loaded, and RE-renders it
  // whenever the container remounts. The container (below, in the "form"
  // branch) unmounts while `sent` (the "check your inbox" view) is
  // showing and remounts if the caller clicks "Use a different email" —
  // `next/script`'s onLoad fires exactly once per script load, not on
  // every remount, so keying this effect on `sent` too (not just
  // scriptLoaded) is what makes a second attempt in the same page load
  // work instead of leaving the submit button gated forever on a widget
  // whose container no longer exists.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !scriptLoaded || sent) return;
    const container = turnstileRef.current;
    if (!container || !window.turnstile) return;

    let widgetId: string | null = null;
    try {
      widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      });
    } catch {
      // A third-party script must never brick our own login form — fail
      // open (same posture as lib/safe-browsing.ts's fail-open contract,
      // applied here to "can the user sign in at all" rather than "should
      // this write be blocked"). Deferred via queueMicrotask, not called
      // directly here: a setState call synchronously inside an effect's own
      // body (as opposed to inside a later-invoked callback, like
      // render()'s callback/error-callback below) trips
      // react-hooks/set-state-in-effect — see docs/guides/design-system.md's
      // useMounted note for the same lint rule hit elsewhere in this
      // codebase.
      queueMicrotask(() => setTurnstileFailed(true));
      return;
    }

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      setTurnstileToken(null);
    };
  }, [scriptLoaded, sent]);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("email");

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        // Omitted entirely (not sent as null/undefined) when there's no
        // token — either Turnstile is unconfigured, or it failed open
        // above. Supabase only enforces captchaToken when ITS OWN
        // Turnstile setting is on, so an omitted token is a normal request
        // in the unconfigured case, exactly like before this unit.
        ...(turnstileToken ? { captchaToken: turnstileToken } : {}),
      },
    });

    setPending(null);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // On success the browser navigates away to Google — only failure ever
    // reaches this line.
    if (oauthError) {
      setPending(null);
      setError(oauthError.message);
    }
  }

  const transition = { duration: reduced ? 0.15 : 0.3, ease: EASE_OUT };
  const from = reduced ? "translateY(0px)" : "translateY(8px)";

  // Blocks email submission until Turnstile has produced a token. Collapses
  // to `false` (no-op, folded straight into the Button's existing disabled=
  // expression below) when unconfigured, and fails back open if the
  // widget/script itself errored (see the effect above) rather than
  // leaving the form stuck disabled with no path forward.
  const turnstileBlocking = Boolean(TURNSTILE_SITE_KEY) && !turnstileToken && !turnstileFailed;

  return (
    <div className="flex flex-col gap-5">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
          onError={() => setTurnstileFailed(true)}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, transform: from }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: from }}
            transition={transition}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Mail className="size-4.5" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="text-foreground">{email}</span>.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-muted-foreground"
              onClick={() => setSent(false)}
            >
              Use a different email
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, transform: from }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: from }}
            transition={transition}
            className="flex flex-col gap-5"
          >
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full gap-2.5 text-sm"
              disabled={pending !== null}
              onClick={handleGoogle}
            >
              {pending === "google" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={pending !== null}
                  className="h-11"
                />
              </div>
              {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full gap-2 text-sm"
                disabled={pending !== null || email.length === 0 || turnstileBlocking}
              >
                {pending === "email" && <Loader2 className="size-4 animate-spin" />}
                Continue with email
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, transform: from }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={transition}
          className="text-center text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
