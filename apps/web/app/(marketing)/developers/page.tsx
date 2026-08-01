import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/brand/backdrop";
import { Section as PageFrame } from "@/components/marketing/section";
import { CodeBlock } from "@/components/marketing/code-block";
import { Section } from "@/components/marketing/developers/section";
import { Endpoint } from "@/components/marketing/developers/endpoint";
import { InlineCode } from "@/components/marketing/developers/inline-code";
import { Callout } from "@/components/marketing/developers/callout";
import { ErrorsTable } from "@/components/marketing/developers/errors-table";
import { Quickstart } from "@/components/marketing/developers/quickstart";
import { ApiToc, type TocItem } from "@/components/marketing/developers/api-toc";
import { API_ENDPOINTS, PIPELINE_ERRORS } from "@/lib/api-reference";
import { PLAN_LIMITS } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "API",
  description:
    "REST API for QRCDN dynamic codes: create, retarget, pause, and pull scan analytics over one scoped, bearer-authenticated endpoint.",
};

// Static reference page: no data fetching, no cookies, no force-dynamic.
// Deliberately indexable (no robots override), unlike /u/[slug] and /login:
// this is public marketing-adjacent documentation, not an auth or
// existence-probing surface. Mirrors /u/[slug]'s static stance but has no
// dynamic route segment, so there is no generateStaticParams here.
//
// P9.5-T1b: restructured onto the docs grid (PageFrame's max-w-page/
// px-gutter outer frame, a max-w-docs content column beside a sticky TOC
// rail) and the shared type scale. P9.5-T5: content ascent, a Quickstart
// (five true-sequence steps, first section in the grid) plus a fully
// comprehensive per-endpoint reference (params/response-fields/errors
// tables, from a typed extension of lib/api-reference.ts verified against
// the actual app/api/v1/** route handlers), replaces what was previously a
// single flat Errors table and lighter endpoint prose. Render mode,
// structural grid, and shiki CodeBlock pattern are all unchanged from
// T1b: this unit is content and one small model extension, not a
// rebuild.
const TOC_ITEMS: TocItem[] = [
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "base-url", label: "Base URL" },
  {
    id: "endpoints",
    label: "Endpoints",
    children: API_ENDPOINTS.map((endpoint) => ({
      id: endpoint.id,
      label: `${endpoint.method} ${endpoint.path}`,
    })),
  },
  { id: "access-controls", label: "Access controls" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate limits & quotas" },
];

export default function DevelopersPage() {
  return (
    <div className="relative overflow-hidden bg-background">
      <HeroBackdrop />

      <PageFrame variant="stack" rhythm="standard" surface="default" divider="none" className="relative">
        <div className="max-w-docs">
          <h1 className="text-h1 font-display font-semibold tracking-tight text-foreground">
            The QRCDN API
          </h1>
          <p className="mt-4 text-lede leading-relaxed text-muted-foreground">
            One scoped surface for your dynamic codes: create them, retarget them, pause
            them, or pull their scan analytics, all over HTTP, all owner-scoped to your
            API key. Retargeting changes where a code points without touching the printed
            QR, because your code never dies.
          </p>
        </div>

        <div className="mt-14 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ApiToc items={TOC_ITEMS} />
            </div>
          </aside>

          <div className="flex max-w-docs flex-col gap-10">
            <Quickstart />

            <Section id="authentication" title="Authentication">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every request carries a bearer token in the <InlineCode>Authorization</InlineCode>{" "}
                header. Mint and revoke keys from{" "}
                <Link href="/api-keys" className="text-primary underline-offset-4 hover:underline">
                  /api-keys
                </Link>
                ; API access is a Pro plan feature. Keys look like <InlineCode>qrcdn_live_…</InlineCode>{" "}
                and are shown in full only once, at creation.
              </p>
              <CodeBlock
                lang="bash"
                code={`curl https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…"`}
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                A key is owner-scoped: every request only ever reads or changes codes its own
                owner created. There is no cross-account visibility, not even to confirm whether a
                given slug exists at all.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A missing or malformed header, a malformed key, and an unknown or revoked key all
                return the same 401 shape (only the message text differs), so probing a key can
                never confirm whether it once existed:
              </p>
              <CodeBlock
                lang="jsonc"
                code={`// 401 Unauthorized
{ "error": "unauthorized", "message": "Invalid API key." }`}
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                A key that authenticates fine but whose plan does not include the API gets a 403
                instead:
              </p>
              <CodeBlock
                lang="jsonc"
                code={`// 403 Forbidden
{ "error": "api_not_available", "message": "The API is available on the Pro plan." }`}
              />
            </Section>

            <Section id="base-url" title="Base URL">
              <InlineCode>https://www.qrcdn.com/api/v1</InlineCode>
            </Section>

            <Section id="endpoints" title="Endpoints">
              <div className="flex flex-col gap-8">
                {API_ENDPOINTS.map((endpoint) => (
                  <Endpoint key={endpoint.id} endpoint={endpoint} />
                ))}
              </div>
            </Section>

            <Section id="access-controls" title="Access controls">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>A code can carry an expiry, a password, or both: each is independent and optional.</li>
                <li>
                  Expiry is settable via the API today (<InlineCode>expiresAt</InlineCode>, PATCH above).
                  Password protection is Studio-only in this release: a plaintext password in an API
                  request body needs its own transport and logging review before it&apos;s exposed here,
                  so it isn&apos;t yet.
                </li>
                <li>
                  A password-protected code&apos;s scan lands on an unlock page; a correct password
                  forwards the visitor to the destination.
                </li>
                <li>
                  An expired code&apos;s scan serves the same unavailable page a paused code does, not the
                  destination. Clearing the expiry brings it straight back: your code never dies.
                </li>
              </ul>
            </Section>

            <Section id="errors" title="Errors">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every non-2xx response is <InlineCode>{`{ "error": "<code>", "message": "<string>" }`}</InlineCode>.
                For 422s the message is often the same short code as the error field
                (e.g. <InlineCode>invalid_destination</InlineCode>, <InlineCode>slug_taken</InlineCode>);
                for other statuses it is a human-readable sentence. A request body that is not valid
                JSON also 422s as <InlineCode>invalid_request</InlineCode>, before any field is even
                looked at.
              </p>

              <p className="text-sm font-medium text-foreground">
                Every endpoint above can also return these, regardless of its own errors table:
              </p>
              <ErrorsTable errors={PIPELINE_ERRORS} />

              <Callout label="By design">
                A 404 from a code-by-slug endpoint never reveals whether the slug exists under a
                different account. If it did, a key could enumerate other people&apos;s slugs one
                probe at a time. Ownership and nonexistence look identical from the outside, on
                purpose.
              </Callout>
            </Section>

            <Section id="rate-limits" title="Rate limits & quotas">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>
                  The API is available on the Pro plan: up to{" "}
                  {PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString()} accepted requests per key
                  per UTC calendar month. The request that would push you over the cap returns{" "}
                  <InlineCode>429 quota_exceeded</InlineCode> instead of running.
                </li>
                <li>
                  The quota resets at the start of each UTC month. Any authenticated request counts
                  toward it, even one that goes on to fail validation (422) or address a code you do
                  not own (404): the count happens at the authentication layer, before your request
                  is evaluated.
                </li>
                <li>
                  There is no burst-level (per-second) rate limiting yet: the monthly cap above is
                  the only ceiling today. Burst limiting arrives with general launch.
                </li>
              </ul>
            </Section>
          </div>
        </div>
      </PageFrame>
    </div>
  );
}
