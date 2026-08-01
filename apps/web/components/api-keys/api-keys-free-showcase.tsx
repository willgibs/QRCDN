import Link from "next/link";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/marketing/code-block";
import { API_ENDPOINTS, type ApiEndpoint } from "@/lib/api-reference";
import { PLAN_LIMITS } from "@/lib/entitlements";

// The free `/api-keys` state (P9.5-T7) — an async Server Component, not a
// branch inside api-keys-panel.tsx: that panel is "use client" (it owns the
// create/revoke form state a Pro caller needs), and CodeBlock
// (components/marketing/code-block.tsx) is itself an async Server Component
// that calls shiki server-side. A client component can still receive a
// server-rendered element as a prop (the RSC-into-client-component slot
// pattern), but here the free state shares none of the panel's hooks or
// props (keys/usageByKeyId mean nothing before a key can exist) — so
// api-keys/page.tsx renders this component directly for free-plan callers
// instead of threading a slot through a component built for the Pro case.
// Bonus: a free-plan visit now ships zero client JS for this content, where
// today's ApiKeysPanel mounts its full hook/handler set regardless of which
// branch it returns.

// A throw-on-miss lookup (not a plain `.find()`), mirroring the
// `pricingRow` helper app/(marketing)/features/access-controls/page.tsx
// already established for the same shape of problem: `.find()` alone types
// as `ApiEndpoint | undefined`, and a module-scope `if (!x) throw` guard
// does not narrow that away inside a function body defined later in the
// file (confirmed by `tsc`, not assumed) — this returns `ApiEndpoint`
// outright, so there is no `| undefined` left to narrow in the first place.
function requireEndpoint(id: string): ApiEndpoint {
  const endpoint = API_ENDPOINTS.find((e) => e.id === id);
  if (!endpoint) {
    // Fails the build/render loudly rather than silently omitting the
    // sample: lib/api-reference.ts's "create-code" id is load-bearing for
    // this component specifically.
    throw new Error(`lib/api-reference.ts: no "${id}" entry found for the /api-keys showcase.`);
  }
  return endpoint;
}

const CREATE_CODE_ENDPOINT = requireEndpoint("create-code");

// Numbers imported from entitlements.ts only (hard rule) — the three labels
// beside them are plain copy, never a number of their own.
const PRO_INCLUDES: readonly string[] = [
  `${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString()} API requests/mo`,
  `${PLAN_LIMITS.pro.dynamicCodes.toLocaleString()} dynamic codes`,
  "Bulk generation",
];

export async function ApiKeysFreeShowcase() {
  return (
    <Card>
      <CardHeader>
        <span className="w-fit rounded-full bg-muted px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          Pro
        </span>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden />
          Build with the QRCDN API
        </CardTitle>
        <CardDescription>
          An API key lets your own systems create, retarget, and read analytics for dynamic codes
          without opening the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <CodeBlock code={CREATE_CODE_ENDPOINT.request.code} lang={CREATE_CODE_ENDPOINT.request.lang} title="Request" />
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            What Pro includes
          </p>
          <ul className="flex flex-col gap-1.5">
            {PRO_INCLUDES.map((line) => (
              <li key={line} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button asChild className="w-full">
          <Link href="/pricing">See pricing</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Paid checkout opens at launch. Start free today and everything carries over.
        </p>
      </CardFooter>
    </Card>
  );
}
