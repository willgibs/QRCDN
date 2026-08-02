// The printed form of a dynamic code's short URL (D1: uppercase, fully
// QR-alphanumeric-mode encodable — `HTTPS://QRCDN.COM/{slug}`). One place
// for this template so the studio's create-code confirmation, the payload
// swap that follows it, and the codes list's "Load in studio" action all
// agree on the exact same string — see docs/guides/design-system.md's D1
// reference and apps/web/lib/slug.ts (slugs are already uppercase; this only
// prefixes the scheme + host).

export const SHORT_URL_HOST = "QRCDN.COM";

export function printedShortUrl(slug: string): string {
  return `HTTPS://${SHORT_URL_HOST}/${slug}`;
}

/**
 * The lowercase, UI-display/copy-target short URL (`https://qrcdn.com/{slug}`)
 * — as opposed to `printedShortUrl`'s uppercase QR-alphanumeric-mode form
 * above, which is for the artifact itself, not a screen a person reads.
 * `lib/codes-core.ts`'s `bulkResultUrl` already builds this exact shape
 * inline for the bulk-create result list; promoted to a shared export here
 * (P9.6-U2) so the /codes table's short-link column
 * (`components/codes/codes-table.tsx`) doesn't hand-roll it a third time.
 */
export function shortUrl(slug: string): string {
  return `https://${SHORT_URL_HOST.toLowerCase()}/${slug}`;
}
