import type { CodeLang } from "./highlight";

/**
 * Typed API reference data for `/developers` (P9.5-T1b) — moved out of
 * the five inline `<Endpoint>` JSX calls + the page-local `ERRORS` array
 * so the page can render them through the shared shiki `CodeBlock`
 * (`lang` metadata per example) and a scroll-spy TOC (stable kebab
 * `id`s). Content/copy is unchanged from the P9-U5 page this unit
 * restructures — structure/treatment only; T5 rewrites the actual words.
 */

export interface ApiCodeExample {
  lang: CodeLang;
  code: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  note?: string;
  request: ApiCodeExample;
  response: ApiCodeExample;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "list-codes",
    method: "GET",
    path: "/codes",
    description: "List every dynamic code owned by this key.",
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
    note: "name and destination are required; style is optional and falls back to QRCDN's default, same as the studio's create flow. slug is optional, Pro-only, and case-insensitive (normalized to uppercase): 4–30 characters from 23456789ABCDEFGHJKMNPQRSTVWXYZ — 0, 1, I, L, O, and U are excluded because they misprint on small labels. A taken slug is a 422 error, not a silent reassignment; omit it for the existing auto-generated path.",
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
    note: "404s — identically — whether the slug never existed or simply is not owned by this key. Ownership is never distinguishable from nonexistence.",
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
    note: "Supply destination, paused, expiresAt, or any combination — at least one field is required, an empty body returns 422 invalid_request. expiresAt takes an ISO-8601 timestamp, or null to clear it; past timestamps are allowed, since expiring a code immediately is a legitimate action, not an error.",
    request: {
      lang: "bash",
      code: `curl -X PATCH https://www.qrcdn.com/api/v1/codes/8K2QRX \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"expiresAt": "2026-08-01T00:00:00.000Z"}'`,
    },
    response: {
      lang: "jsonc",
      code: `{
  "slug": "8K2QRX",
  "destination": "https://example.com/promo",
  "status": "active",
  "expiresAt": "2026-08-01T00:00:00.000Z"
}`,
    },
  },
  {
    id: "code-analytics",
    method: "GET",
    path: "/codes/{slug}/analytics",
    description: "Scan analytics for one code — the same data your dashboard renders.",
    note: "?range=7|30|90|365 (days). Defaults to 30, clamped to your plan's retention window.",
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

export interface ApiError {
  status: string;
  error: string;
  meaning: string;
}

export const API_ERRORS: ApiError[] = [
  { status: "401", error: "unauthorized", meaning: "Missing, malformed, unknown, or revoked API key." },
  { status: "403", error: "api_not_available", meaning: "Your plan does not include API access (Pro only)." },
  { status: "403", error: "code_limit_reached", meaning: "You have reached your plan's dynamic code limit." },
  { status: "404", error: "not_found", meaning: "The code does not exist, or is not owned by this key." },
  {
    status: "422",
    error: "invalid_request",
    meaning:
      "The request body failed validation — includes an empty PATCH body, a taken/reserved/malformed vanity slug, or an unparseable expiresAt.",
  },
  { status: "429", error: "quota_exceeded", meaning: "Monthly request quota exceeded." },
  { status: "500", error: "internal_error", meaning: "Something went wrong on our end. Retry." },
];
