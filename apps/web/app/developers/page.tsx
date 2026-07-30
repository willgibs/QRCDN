import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/explore/backdrop";
import { ModuleMark } from "@/components/brand/magic";

export const metadata: Metadata = {
  title: "API",
  description:
    "REST API for QRCDN dynamic codes: create, retarget, pause, and pull scan analytics over one scoped, bearer-authenticated endpoint.",
};

// Static reference page — no data fetching, no cookies, no force-dynamic.
// Deliberately indexable (no robots override), unlike /u/[slug] and /login:
// this is public marketing-adjacent documentation, not an auth or
// existence-probing surface. Mirrors /u/[slug]'s static stance but has no
// dynamic route segment, so there is no generateStaticParams here.

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-4 py-3 text-[13px] leading-relaxed">
      <code className="font-mono text-foreground">{code}</code>
    </pre>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

function Method({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-primary">
      {children}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/60 pt-10">
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Endpoint({
  method,
  path,
  description,
  note,
  request,
  response,
}: {
  method: string;
  path: string;
  description: string;
  note?: string;
  request: string;
  response: string;
}) {
  return (
    <div className="border-t border-border/40 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Method>{method}</Method>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
      <div className="mt-3 grid gap-2.5">
        <CodeBlock code={request} />
        <CodeBlock code={response} />
      </div>
    </div>
  );
}

const ERRORS: { status: string; error: string; meaning: string }[] = [
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

export default function DevelopersPage() {
  return (
    <div className="relative overflow-hidden bg-background">
      <HeroBackdrop />

      <div className="relative mx-auto flex max-w-3xl flex-col px-6 py-16 sm:py-20">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 font-display text-lg font-bold tracking-tight text-foreground"
        >
          <ModuleMark className="size-3.5 text-primary" />
          QRCDN
        </Link>

        <div className="mt-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            The QRCDN API
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            One scoped surface for your dynamic codes: create them, retarget them, pause
            them, or pull their scan analytics — all over HTTP, all owner-scoped to your
            API key. Retargeting changes where a code points without touching the printed
            QR, because your code never dies.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-10">
          <Section title="Authentication">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every request carries a bearer token in the <InlineCode>Authorization</InlineCode>{" "}
              header. Mint and revoke keys from <Link href="/api-keys" className="text-primary underline-offset-4 hover:underline">/api-keys</Link>{" "}
              — API access is a Pro plan feature. Keys look like <InlineCode>qrcdn_live_…</InlineCode>{" "}
              and are shown in full only once, at creation.
            </p>
            <CodeBlock
              code={`curl https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}
            />
          </Section>

          <Section title="Base URL">
            <InlineCode>https://www.qrcdn.com/api/v1</InlineCode>
          </Section>

          <Section title="Endpoints">
            <div className="flex flex-col gap-8">
              <Endpoint
                method="GET"
                path="/codes"
                description="List every dynamic code owned by this key."
                request={`curl https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…"`}
                response={`{
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
}`}
              />

              <Endpoint
                method="POST"
                path="/codes"
                description="Create a dynamic code."
                note="name and destination are required; style is optional and falls back to QRCDN's default, same as the studio's create flow. slug is optional, Pro-only, and case-insensitive (normalized to uppercase): 4–30 characters from 23456789ABCDEFGHJKMNPQRSTVWXYZ — 0, 1, I, L, O, and U are excluded because they misprint on small labels. A taken slug is a 422 error, not a silent reassignment; omit it for the existing auto-generated path."
                request={`curl -X POST https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Storefront flyer", "destination": "https://example.com/promo", "slug": "mybrand26"}'`}
                response={`// 201 Created
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
}`}
              />

              <Endpoint
                method="GET"
                path="/codes/{slug}"
                description="Fetch one code by slug."
                note="404s — identically — whether the slug never existed or simply is not owned by this key. Ownership is never distinguishable from nonexistence."
                request={`curl https://www.qrcdn.com/api/v1/codes/8K2QRX \\
  -H "Authorization: Bearer qrcdn_live_…"`}
                response={`{
  "slug": "8K2QRX",
  "name": "Storefront flyer",
  "destination": "https://example.com/promo",
  "status": "active",
  "scanCount": 142,
  "expiresAt": null,
  "passwordProtected": false,
  "url": "https://qrcdn.com/8K2QRX",
  "createdAt": "2026-07-01T12:00:00.000Z"
}`}
              />

              <Endpoint
                method="PATCH"
                path="/codes/{slug}"
                description="Retarget, pause, and/or set a code's expiry."
                note="Supply destination, paused, expiresAt, or any combination — at least one field is required, an empty body returns 422 invalid_request. expiresAt takes an ISO-8601 timestamp, or null to clear it; past timestamps are allowed, since expiring a code immediately is a legitimate action, not an error."
                request={`curl -X PATCH https://www.qrcdn.com/api/v1/codes/8K2QRX \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"expiresAt": "2026-08-01T00:00:00.000Z"}'`}
                response={`{
  "slug": "8K2QRX",
  "destination": "https://example.com/promo",
  "status": "active",
  "expiresAt": "2026-08-01T00:00:00.000Z"
}`}
              />

              <Endpoint
                method="GET"
                path="/codes/{slug}/analytics"
                description="Scan analytics for one code — the same data your dashboard renders."
                note="?range=7|30|90|365 (days). Defaults to 30, clamped to your plan's retention window."
                request={`curl "https://www.qrcdn.com/api/v1/codes/8K2QRX/analytics?range=30" \\
  -H "Authorization: Bearer qrcdn_live_…"`}
                response={`{
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
}`}
              />
            </div>
          </Section>

          <Section title="Access controls">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>A code can carry an expiry, a password, or both — each is independent and optional.</li>
              <li>
                Expiry is settable via the API today (<InlineCode>expiresAt</InlineCode>, PATCH above).
                Password protection is Studio-only in this release — a plaintext password in an API
                request body needs its own transport and logging review before it&apos;s exposed here,
                so it isn&apos;t yet.
              </li>
              <li>
                A password-protected code&apos;s scan lands on an unlock page; a correct password
                forwards the visitor to the destination.
              </li>
              <li>
                An expired code&apos;s scan serves the same unavailable page a paused code does, not the
                destination. Clearing the expiry brings it straight back — your code never dies.
              </li>
            </ul>
          </Section>

          <Section title="Errors">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every non-2xx response is <InlineCode>{`{ "error": "<code>", "message": "<string>" }`}</InlineCode>.
              For 422s the message is often the same short code as the error field
              (e.g. <InlineCode>invalid_destination</InlineCode>, <InlineCode>slug_taken</InlineCode>);
              for other statuses it is a human-readable sentence.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">error</th>
                    <th className="px-4 py-2.5 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {ERRORS.map((row) => (
                    <tr key={row.error} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-2.5 align-top font-mono text-foreground">{row.status}</td>
                      <td className="px-4 py-2.5 align-top font-mono text-foreground">{row.error}</td>
                      <td className="px-4 py-2.5 align-top text-muted-foreground">{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Rate limits &amp; quotas">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>The API is available on the Pro plan: 10,000 requests per key per UTC calendar month.</li>
              <li>
                The quota resets at the start of each UTC month. Once you are over cap, every
                request returns <InlineCode>429 quota_exceeded</InlineCode> until it resets.
              </li>
              <li>
                Any authenticated request counts toward the quota, even one that goes on to fail
                validation (422) or address a code you do not own (404) — the count happens at
                the authentication layer, before your request is evaluated.
              </li>
              <li>
                There is no burst-level (per-second) rate limiting yet — the monthly cap above is
                the only ceiling today. Burst limiting arrives with general launch.
              </li>
            </ul>
          </Section>
        </div>

        <footer className="mt-16 flex items-center gap-6 border-t border-border/60 pt-8 font-mono text-xs text-muted-foreground">
          <Link href="/api-keys" className="text-primary underline-offset-4 hover:underline">
            Manage your keys
          </Link>
          <Link href="/" className="hover:text-foreground hover:underline underline-offset-4">
            QRCDN home
          </Link>
        </footer>
      </div>
    </div>
  );
}
