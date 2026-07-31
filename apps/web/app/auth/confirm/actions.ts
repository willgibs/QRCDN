"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// P9.5-T0: server half of the scanner-proof /auth/confirm flow. The old
// route.ts GET handler called verifyOtp() on every request, including a
// mail-security scanner's pre-fetch of the link before a human ever opened
// it — silently burning the single-use token (docs/DECISIONS.md D9's dated
// note). Moving the exchange behind this POST-only server action, invoked
// only by the <form> in app/auth/confirm/page.tsx, is what makes a bare GET
// of the confirm URL consume nothing.
//
// "use server" files may export async functions only
// (lib/use-server-contract.test.ts) — everything else here stays
// unexported.

const DEFAULT_NEXT = "/studio";
const FAILURE_REDIRECT = "/login?auth_error=link_invalid";

/**
 * Rejects anything that isn't a same-origin absolute path. An absolute URL
 * (`https://evil.com`), a protocol-relative one (`//evil.com`), or a
 * backslash trick (`/\evil.com` — some browsers treat this as
 * protocol-relative too) would otherwise let a crafted `next` value send a
 * confirmed sign-in off this origin. The old route.ts passed `next`
 * straight into `new URL(next, origin)`, which resolves an absolute `next`
 * to ITSELF rather than against `origin` — the same open-redirect this
 * guard closes.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_NEXT;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_NEXT;
  }
  return value;
}

/**
 * Exchanges a magic-link `token_hash` for a session. `type` is passed
 * through as a plain string — auth-js's `EmailOtpType` is itself a loose
 * union (`'signup' | 'invite' | ... | (string & {})`), so no cast is
 * needed, and an invalid value simply fails at `verifyOtp` like any other
 * bad token, landing on the same generic error redirect as everything else
 * below.
 */
export async function confirmSignInAction(formData: FormData): Promise<void> {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  const next = safeNextPath(formData.get("next"));

  if (typeof tokenHash !== "string" || tokenHash.length === 0 || typeof type !== "string" || type.length === 0) {
    redirect(FAILURE_REDIRECT);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    redirect(FAILURE_REDIRECT);
  }

  redirect(next);
}
