import { SHORT_URL_HOST } from "../../../../lib/short-url";
import type { DynamicCodeSummary } from "../../../../lib/codes-core";

// Shared response shape for every /api/v1/codes* endpoint that returns a
// code (list, create, get-by-slug, analytics' `code` field) — one place so
// the camelCase-vs-db-column mapping and the `url` construction can't drift
// between routes.

export interface ApiCode {
  slug: string;
  name: string;
  destination: string;
  status: string;
  scanCount: number;
  url: string;
  createdAt: string;
}

/**
 * `url` is the lowercase-scheme, lowercase-host form
 * (`https://qrcdn.com/{slug}`), NOT `lib/short-url.ts`'s `printedShortUrl`
 * (`HTTPS://QRCDN.COM/{slug}`, the all-caps QR-alphanumeric-mode form meant
 * for print/display — D1). API consumers get a normal-looking URL they can
 * paste into a browser or fetch directly; the slug itself is left exactly
 * as stored (auto-generated slugs are already uppercase per D12, and the
 * Worker matches case-insensitively, so this is display preference only,
 * not a correctness requirement).
 */
export function toApiCode(code: DynamicCodeSummary): ApiCode {
  return {
    slug: code.slug,
    name: code.name,
    destination: code.destination_url ?? "",
    status: code.status,
    scanCount: code.scan_count,
    url: `https://${SHORT_URL_HOST.toLowerCase()}/${code.slug}`,
    createdAt: code.created_at,
  };
}
