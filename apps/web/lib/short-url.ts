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
