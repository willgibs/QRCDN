import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "./learn-more-link";
import { ProductWindow } from "./product-window";
import { PLAN_LIMITS } from "@/lib/entitlements";

// 07 — API (P9.5-T3a: migrated onto Section/SectionHeading, copy deck v3
// head/lede/mono strip applied). Doorway points at a real, already-shipped
// page (/developers) — not gated behind FEATURE_DOORWAYS_ENABLED like the
// /features/* doorways elsewhere on this page. Request/response bodies
// stay copied verbatim from app/(marketing)/developers/page.tsx's real
// POST /codes Endpoint (same route, same shapes) — never invented.
const CURL_REQUEST = `curl -X POST https://www.qrcdn.com/api/v1/codes \\
  -H "Authorization: Bearer qrcdn_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Storefront flyer", "destination": "https://example.com/promo", "slug": "mybrand26"}'`;

const JSON_RESPONSE = `// 201 Created
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
}`;

export function ApiSection() {
  return (
    <Section id="api" variant="split" divider="none">
      <SectionHeading
        eyebrow="API"
        index="07"
        title="Every code, over HTTP."
        lede="Create, retarget, pause, measure: the whole surface, owner-scoped to a key."
        className="mb-10"
      />

      <SectionBody className="max-w-3xl">
        <ProductWindow url="POST /api/v1/codes">
          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed">
              <code className="font-mono text-foreground">{CURL_REQUEST}</code>
            </pre>
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12.5px] leading-relaxed">
              <code className="font-mono text-foreground">{JSON_RESPONSE}</code>
            </pre>
          </div>
        </ProductWindow>
      </SectionBody>

      <SectionBody delay={0.15} className="mt-8 flex flex-col items-start gap-4">
        <MonoStrip>
          bearer auth · {PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString()} req/mo on Pro · 404
          never reveals whether a code exists or is merely not yours
        </MonoStrip>
        <LearnMoreLink href="/developers">Read the docs</LearnMoreLink>
      </SectionBody>
    </Section>
  );
}
