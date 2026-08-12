/**
 * The address a human reads (P9.10-D7).
 *
 * Extracted while building /contact, for a specific reason rather than
 * tidiness: `e2e/`'s fixture-safety guard (`lib/e2e-safety.test.ts`) is an
 * allowlist that rejects EVERY email-shaped string literal under `e2e/`
 * except the throwaway `e2e-<uuid>@e2e.qrcdn.test` fixture shape. That
 * guard exists because nothing else can catch the e2e suite pointing
 * production Supabase writes at a real address, and it is deliberately an
 * allowlist because a denylist only catches leaks someone thought to name
 * in advance. So the contact-page e2e imports this constant the same way
 * it already imports PLAN_LIMITS, and the guard stays exactly as strict
 * as it was.
 *
 * NOTE: five other call sites still hard-code the same address
 * (site-footer, open-source-section, pricing, terms, privacy). They are
 * correct today and were left alone rather than migrated inside a design
 * round; if the address ever changes, this constant is where it should
 * end up living for all of them.
 */
export const CONTACT_EMAIL = "hello@qrcdn.com";

/** A pre-filled subject line is the only routing we have: there is no
 *  ticket queue behind this address and no separate desks, which is what
 *  /contact says in as many words rather than implying otherwise. */
export function contactMailto(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`QRCDN: ${subject}`)}`;
}
