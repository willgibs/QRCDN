import type { CodeLang } from "./highlight";
import type { ApiCode } from "../app/api/v1/_lib/to-api-code";
import { PLAN_LIMITS } from "./entitlements";
import { RANGE_OPTIONS } from "./analytics";

/**
 * Typed API reference data for `/developers` (P9.5-T1b, content-ascended at
 * P9.5-T5). Ground truth for everything below is the actual route handlers
 * under `app/api/v1/**` and the auth pipeline they share (`lib/api-auth.ts`),
 * verified by reading the handlers directly, not carried over from memory.
 * Every plan number is imported from `lib/entitlements.ts` (the hard rule),
 * never hand-typed; the response-field model for the shared "code object"
 * shape is compile-time coupled to `ApiCode` (`app/api/v1/_lib/to-api-code.ts`)
 * via `Record<keyof ApiCode, ...>` below, so a field this module forgets to
 * document, or documents after it no longer exists, fails `pnpm typecheck`
 * rather than waiting on a manual review to catch it.
 */

export interface ApiCodeExample {
  lang: CodeLang;
  code: string;
}

export interface ApiParam {
  name: string;
  in: "path" | "query" | "body";
  type: string;
  required: boolean;
  notes: string;
}

export interface ApiResponseField {
  name: string;
  type: string;
  notes: string;
}

/** Shared shape for both a per-endpoint errors table and the pipeline-wide
 *  one (`PIPELINE_ERRORS` below): identical columns, so one component
 *  renders both. */
export interface ApiEndpointError {
  status: number;
  code: string;
  when: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params: ApiParam[];
  responseFields: ApiResponseField[];
  errors: ApiEndpointError[];
  request: ApiCodeExample;
  response: ApiCodeExample;
}

// ============================================================ shared response fields
// The "code object" every list/create/get response returns verbatim, and
// every other shape (list's items, analytics' `code`) nests or references.
// Keyed as `Record<keyof ApiCode, ...>` so TypeScript itself proves this
// covers every field `toApiCode` can produce, no more and no less, rather
// than trusting a hand-maintained list to stay in sync.
const CODE_FIELD_NOTES: Record<keyof ApiCode, { type: string; notes: string }> = {
  slug: {
    type: "string",
    notes: "Uppercase. The path segment in the code's short URL.",
  },
  name: {
    type: "string",
    notes: "Set at creation. This API has no endpoint to rename a code afterward.",
  },
  destination: {
    type: "string",
    notes: "Where a scan currently redirects to.",
  },
  status: {
    type: '"active" | "paused" | "archived"',
    notes:
      "Does not account for expiry: a code past its expiresAt still reports status active here. Compare expiresAt yourself if you need to know whether scans are actually reaching the destination.",
  },
  scanCount: {
    type: "number",
    notes:
      "All-time total, updated by an hourly rollup rather than per scan: a scan from the last few minutes may not be reflected yet. The analytics endpoint's today.scans is live.",
  },
  brandKitId: {
    type: "string | null",
    notes:
      "The brand kit this code mirrors: editing that kit in the Studio restyles the code. null means the code was created with an explicit style and is frozen, never restyled by kit edits.",
  },
  expiresAt: {
    type: "string | null",
    notes:
      "ISO-8601 UTC, or null if the code never expires. Once in the past, scans hit the same unavailable page a paused code shows, even while status above still reads active.",
  },
  passwordProtected: {
    type: "boolean",
    notes: "Never the password or a hash of it: only whether one is set.",
  },
  url: {
    type: "string",
    notes: "https://qrcdn.com/{slug}, lowercase host. Not the uppercase form printed on the QR itself.",
  },
  createdAt: {
    type: "string",
    notes: "ISO-8601 UTC.",
  },
};

const CODE_OBJECT_FIELDS: ApiResponseField[] = (Object.keys(CODE_FIELD_NOTES) as (keyof ApiCode)[]).map(
  (name) => ({ name, ...CODE_FIELD_NOTES[name] }),
);

const LIST_CODES_RESPONSE_FIELDS: ApiResponseField[] = [
  {
    name: "codes",
    type: "ApiCode[]",
    notes: "Every dynamic code this key's owner has created, newest first.",
  },
  ...CODE_OBJECT_FIELDS.map((field) => ({ ...field, name: `codes[].${field.name}` })),
];

// PATCH's response is deliberately narrower than the full code object
// (no name, scanCount, passwordProtected, url, or createdAt). Reusing
// CODE_FIELD_NOTES for the 4 keys it does share keeps the wording
// byte-identical to the full reference above rather than a second,
// driftable copy.
const UPDATE_CODE_RESPONSE_KEYS = ["slug", "destination", "status", "expiresAt"] as const;
const UPDATE_CODE_RESPONSE_FIELDS: ApiResponseField[] = UPDATE_CODE_RESPONSE_KEYS.map((name) => ({
  name,
  ...CODE_FIELD_NOTES[name],
}));

const ANALYTICS_RESPONSE_FIELDS: ApiResponseField[] = [
  {
    name: "range",
    type: "number",
    notes: "The window actually applied, in days, after clamping to your plan's retention window.",
  },
  {
    name: "code",
    type: "ApiCode",
    notes: "The same shape GET /codes/{slug} returns: see its fields above.",
  },
  { name: "series[].day", type: "string", notes: "YYYY-MM-DD, UTC." },
  { name: "series[].scans", type: "number", notes: "Scans that day." },
  {
    name: "series[].uniques",
    type: "number",
    notes:
      "A per-day approximation from a salted, daily-rotating IP hash. Meaningful for a single day; not safe to sum across days.",
  },
  { name: "totals.scans", type: "number", notes: "Sum of series[].scans over the window." },
  {
    name: "today.scans",
    type: "number",
    notes:
      "Live count for the current UTC day, read straight from raw scan events rather than the rollup above (which lags up to an hour behind).",
  },
  { name: "topCountries[].key", type: "string", notes: "ISO-ish country code, or Other once the tail beyond the top 5 is folded together." },
  { name: "topCountries[].count", type: "number", notes: "Scans attributed to that country over the window." },
  { name: "topDevices[].key", type: "string", notes: "e.g. mobile, desktop, tablet." },
  { name: "topDevices[].count", type: "number", notes: "Scans attributed to that device type over the window." },
  { name: "recentEvents[].ts", type: "string", notes: "ISO-8601 UTC." },
  { name: "recentEvents[].country", type: "string | null", notes: "Nullable: geo lookups can fail." },
  { name: "recentEvents[].region", type: "string | null", notes: "Nullable: geo lookups can fail." },
  { name: "recentEvents[].city", type: "string | null", notes: "Nullable: geo lookups can fail." },
  { name: "recentEvents[].device", type: "string | null", notes: "Nullable when device class can't be parsed from the user agent." },
  { name: "recentEvents[].referer", type: "string | null", notes: "Null for a direct scan: there is no referring page to report." },
];

// ============================================================ shared error rows
// Numbers interpolated from entitlements.ts (hard rule), never hand-typed.
const FREE_CODE_LIMIT = PLAN_LIMITS.free.dynamicCodes;
const PRO_CODE_LIMIT = PLAN_LIMITS.pro.dynamicCodes;

const CREATE_CODE_ERRORS: ApiEndpointError[] = [
  {
    status: 422,
    code: "invalid_request",
    when:
      "Validation failed: a bad name, destination, style, or vanity slug. message often carries the specific reason, e.g. invalid_destination, slug_taken, slug_reserved, or destination_unsafe (the destination failed a safety check).",
  },
  {
    status: 403,
    code: "code_limit_reached",
    when: `You are at your plan's dynamic code limit (${FREE_CODE_LIMIT} free, ${PRO_CODE_LIMIT} Pro).`,
  },
  {
    status: 403,
    code: "vanity_slugs_not_available",
    when: "slug was supplied, but your plan does not include vanity slugs (Pro only).",
  },
  {
    status: 500,
    code: "internal_error",
    when: "A backend failure: the profile lookup, the code-count check, the insert itself, or 5 straight slug collisions.",
  },
];

const NOT_FOUND_WHEN =
  "The slug does not exist, or exists but is owned by a different key. See Errors below for why the two cases look identical on purpose.";

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "list-codes",
    method: "GET",
    path: "/codes",
    description: "List every dynamic code owned by this key.",
    params: [],
    responseFields: LIST_CODES_RESPONSE_FIELDS,
    errors: [{ status: 500, code: "internal_error", when: "The codes query failed on our end." }],
    request: {
      lang: "bash",
      code: `curl https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…"`,
    },
    response: {
      lang: "jsonc",
      code: `{
  "codes": [
    {
      "slug": "8K2QRX",
      "name": "Storefront flyer",
      "destination": "https://example.com/promo",
      "status": "active",
      "scanCount": 142,
      "expiresAt": null,
      "passwordProtected": false,
      "url": "https://qrcdn.com/8K2QRX",
      "createdAt": "2026-07-01T12:00:00.000Z"
    }
  ]
}`,
    },
  },
  {
    id: "create-code",
    method: "POST",
    path: "/codes",
    description: "Create a dynamic code.",
    params: [
      { name: "name", in: "body", type: "string", required: true, notes: "1 to 60 characters, trimmed." },
      {
        name: "destination",
        in: "body",
        type: "string",
        required: true,
        notes:
          "HTTP or HTTPS URL, up to 2048 characters. Needs a real, dotted hostname: bare IPs and localhost are rejected.",
      },
      {
        name: "style",
        in: "body",
        type: "object",
        required: false,
        notes:
          "A QrStyle v1 object (dots, eyes, fill, background, logo), the same JSON the Studio's editor exports. Providing one makes the code kit-less and frozen: kit edits never restyle it. Omit it and the code takes your default brand kit's style and attaches to that kit, following its future edits; with no default kit it falls back to the standard style, frozen.",
      },
      {
        name: "slug",
        in: "body",
        type: "string",
        required: false,
        notes:
          "Pro plan only. 4 to 30 characters from 23456789ABCDEFGHJKMNPQRSTVWXYZ (0, 1, I, L, O, and U excluded: they misprint on small labels). Case-insensitive, normalized to uppercase. A taken or reserved slug is rejected, never silently reassigned.",
      },
    ],
    responseFields: CODE_OBJECT_FIELDS,
    errors: CREATE_CODE_ERRORS,
    request: {
      lang: "bash",
      code: `curl -X POST https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Storefront flyer", "destination": "https://example.com/promo", "slug": "mybrand26"}'`,
    },
    response: {
      lang: "jsonc",
      code: `// 201 Created
{
  "slug": "MYBRAND26",
  "name": "Storefront flyer",
  "destination": "https://example.com/promo",
  "status": "active",
  "scanCount": 0,
  "brandKitId": "8a9f1c2e-4b3d-4e5f-9a0b-1c2d3e4f5a6b",
  "expiresAt": null,
  "passwordProtected": false,
  "url": "https://qrcdn.com/MYBRAND26",
  "createdAt": "2026-07-23T09:14:02.000Z"
}`,
    },
  },
  {
    id: "get-code",
    method: "GET",
    path: "/codes/{slug}",
    description: "Fetch one code by slug.",
    params: [
      {
        name: "slug",
        in: "path",
        type: "string",
        required: true,
        notes: "Case-sensitive: slugs are always stored uppercase, so pass it exactly as returned.",
      },
    ],
    responseFields: CODE_OBJECT_FIELDS,
    errors: [{ status: 404, code: "not_found", when: NOT_FOUND_WHEN }],
    request: {
      lang: "bash",
      code: `curl https://www.qrcdn.com/api/v1/codes/8K2QRX \\
  -H "Authorization: Bearer qrcdn_live_…"`,
    },
    response: {
      lang: "jsonc",
      code: `{
  "slug": "8K2QRX",
  "name": "Storefront flyer",
  "destination": "https://example.com/promo",
  "status": "active",
  "scanCount": 142,
  "expiresAt": null,
  "passwordProtected": false,
  "url": "https://qrcdn.com/8K2QRX",
  "createdAt": "2026-07-01T12:00:00.000Z"
}`,
    },
  },
  {
    id: "update-code",
    method: "PATCH",
    path: "/codes/{slug}",
    description: "Retarget, pause, and/or set a code's expiry.",
    params: [
      {
        name: "slug",
        in: "path",
        type: "string",
        required: true,
        notes: "Case-sensitive, same as GET.",
      },
      {
        name: "destination",
        in: "body",
        type: "string",
        required: false,
        notes: "New destination. Same URL rules as create.",
      },
      {
        name: "paused",
        in: "body",
        type: "boolean",
        required: false,
        notes:
          "true pauses the code (a scan hits the same unavailable page an expired code does); false resumes it.",
      },
      {
        name: "expiresAt",
        in: "body",
        type: "string | null",
        required: false,
        notes:
          "Pro plan only. ISO-8601 timestamp to set the expiry, or null to clear it. Past timestamps are accepted: expiring a code immediately is a legitimate request, not an error.",
      },
    ],
    responseFields: UPDATE_CODE_RESPONSE_FIELDS,
    errors: [
      {
        status: 422,
        code: "invalid_request",
        when:
          "Validation failed: an empty body (message empty_patch: at least one field is required), a bad or unsafe destination (invalid_destination, destination_too_long, destination_unsafe), a non-boolean paused (invalid_paused), or an unparseable expiresAt (invalid_expiry).",
      },
      {
        status: 403,
        code: "plan_required",
        when: "expiresAt was supplied, but your plan does not include access controls (Pro only).",
      },
      { status: 404, code: "not_found", when: NOT_FOUND_WHEN },
      {
        status: 500,
        code: "internal_error",
        when: "The update itself failed on our end.",
      },
    ],
    request: {
      lang: "bash",
      code: `curl -X PATCH https://www.qrcdn.com/api/v1/codes/8K2QRX \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"destination": "https://example.com/new-promo"}'`,
    },
    response: {
      lang: "jsonc",
      code: `{
  "slug": "8K2QRX",
  "destination": "https://example.com/new-promo",
  "status": "active",
  "expiresAt": null
}`,
    },
  },
  {
    id: "code-analytics",
    method: "GET",
    path: "/codes/{slug}/analytics",
    description: "Scan analytics for one code: the same data your dashboard renders.",
    params: [
      {
        name: "slug",
        in: "path",
        type: "string",
        required: true,
        notes: "Case-sensitive, same as GET.",
      },
      {
        name: "range",
        in: "query",
        type: `${RANGE_OPTIONS.join(" | ")} (days)`,
        required: false,
        notes: `Defaults to 30. A value over your plan's retention window clamps down to the largest option that fits (${PLAN_LIMITS.free.analyticsRetentionDays}d free, ${PLAN_LIMITS.pro.analyticsRetentionDays}d Pro); malformed or unlisted values also fall back to the default.`,
      },
    ],
    responseFields: ANALYTICS_RESPONSE_FIELDS,
    errors: [
      { status: 404, code: "not_found", when: NOT_FOUND_WHEN },
      { status: 500, code: "internal_error", when: "The analytics query failed on our end." },
    ],
    request: {
      lang: "bash",
      code: `curl "https://www.qrcdn.com/api/v1/codes/8K2QRX/analytics?range=30" \\
  -H "Authorization: Bearer qrcdn_live_…"`,
    },
    response: {
      lang: "jsonc",
      code: `{
  "range": 30,
  "code": {
    "slug": "8K2QRX",
    "name": "Storefront flyer",
    "destination": "https://example.com/promo",
    "status": "active",
    "scanCount": 142,
    "expiresAt": null,
    "passwordProtected": false,
    "url": "https://qrcdn.com/8K2QRX",
    "createdAt": "2026-07-01T12:00:00.000Z"
  },
  "series": [
    { "day": "2026-06-24", "scans": 12, "uniques": 9 }
  ],
  "totals": { "scans": 142 },
  "today": { "scans": 3 },
  "topCountries": [
    { "key": "US", "count": 88 }
  ],
  "topDevices": [
    { "key": "mobile", "count": 120 }
  ],
  "recentEvents": [
    {
      "ts": "2026-07-23T09:10:44.000Z",
      "country": "US",
      "region": "CA",
      "city": "San Francisco",
      "device": "mobile",
      "referer": "https://instagram.com"
    }
  ]
}`,
    },
  },
];

// ============================================================ quickstart-only examples
// A deliberately minimal, plan-safe pair for the Quickstart section
// (P9.5-T5), distinct from create-code/update-code above on purpose:
// create-code's own reference sample demonstrates the Pro-only vanity
// `slug` field (real, valuable documentation of an optional feature), but
// a brand-new signup following the Quickstart is very likely still on the
// free plan, where a `slug` in the body 403s with
// vanity_slugs_not_available. Shipping that as someone's first
// copy-pasted call would break for most readers. These two stay in sync
// as one small, self-contained "same code end to end" story: create
// returns K4RN9WD pointing at /launch, repoint moves that same slug to
// /launch-v2, never duplicated elsewhere, so there is nothing for this
// pair to drift against.
export const QUICKSTART_CREATE_EXAMPLE: { request: ApiCodeExample; response: ApiCodeExample } = {
  request: {
    lang: "bash",
    code: `curl -X POST https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Launch poster", "destination": "https://example.com/launch"}'`,
  },
  response: {
    lang: "jsonc",
    code: `// 201 Created
{
  "slug": "K4RN9WD",
  "name": "Launch poster",
  "destination": "https://example.com/launch",
  "status": "active",
  "scanCount": 0,
  "expiresAt": null,
  "passwordProtected": false,
  "url": "https://qrcdn.com/K4RN9WD",
  "createdAt": "2026-07-23T09:14:02.000Z"
}`,
  },
};

export const QUICKSTART_REPOINT_EXAMPLE: { request: ApiCodeExample; response: ApiCodeExample } = {
  request: {
    lang: "bash",
    code: `curl -X PATCH https://www.qrcdn.com/api/v1/codes/K4RN9WD \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"destination": "https://example.com/launch-v2"}'`,
  },
  response: {
    lang: "jsonc",
    code: `{
  "slug": "K4RN9WD",
  "destination": "https://example.com/launch-v2",
  "status": "active",
  "expiresAt": null
}`,
  },
};

// ============================================================ pipeline-wide errors
// Apply identically to every endpoint above, regardless of which handler
// runs: all three fire from the shared auth/quota pipeline
// (lib/api-auth.ts) before a route handler's own logic is ever reached.
// Kept separate from each endpoint's own errors[] rather than repeated five
// times over.
export const PIPELINE_ERRORS: ApiEndpointError[] = [
  {
    status: 401,
    code: "unauthorized",
    when:
      "A missing/malformed Authorization header, a malformed key, or an unknown/revoked key. All three return this exact status, code, and (mostly) message on purpose: a caller can never learn whether a key ever existed by probing it.",
  },
  {
    status: 403,
    code: "api_not_available",
    when: "Your plan does not include API access (the free plan; the API is Pro-only).",
  },
  {
    status: 429,
    code: "quota_exceeded",
    when: `You are over your plan's monthly request cap (${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString()} on Pro). Resets at the start of the next UTC calendar month.`,
  },
  {
    status: 500,
    code: "internal_error",
    when: "A rare failure in the shared auth/quota pipeline itself, before your request reached a handler. Retry.",
  },
];
