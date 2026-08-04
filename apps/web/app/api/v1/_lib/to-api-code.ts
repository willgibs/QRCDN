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
  /** The brand kit this code mirrors under hard sync (P9.8-B1, D5 as
   *  amended) — kit edits propagate to the code's style. `null` means the
   *  code is kit-less and its style is a frozen snapshot (a create with an
   *  explicit `style`, or a pre-P9.8 code). */
  brandKitId: string | null;
  /** ISO-8601 UTC, or `null` when the code never expires (P7.5-U2). */
  expiresAt: string | null;
  /** Never the hash itself — see codes-core.ts's DynamicCodeSummary/
   *  toSummary invariant, which this type inherits from (P7.5-U2). */
  passwordProtected: boolean;
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
    brandKitId: code.brandKitId,
    expiresAt: code.expiresAt,
    passwordProtected: code.passwordProtected,
    url: `https://${SHORT_URL_HOST.toLowerCase()}/${code.slug}`,
    createdAt: code.created_at,
  };
}
