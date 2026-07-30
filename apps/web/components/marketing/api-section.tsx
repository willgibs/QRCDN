import { Eyebrow, Reveal } from "@/components/brand/magic";
import { LearnMoreLink } from "./learn-more-link";
import { ProductWindow } from "./product-window";

// Request/response bodies copied verbatim from app/developers/page.tsx's
// real POST /codes Endpoint (same route, same shapes) — never invented.
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
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>API</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Automate it.
          </h2>
          <p className="mt-2 text-muted-foreground">
            One scoped surface: create, retarget, pause, measure — over HTTP,
            with a per-key monthly quota.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-3xl">
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

          <div className="mt-6">
            <LearnMoreLink href="/developers">See the API</LearnMoreLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
