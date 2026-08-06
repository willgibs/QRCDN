import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { LearnMoreLink } from "./learn-more-link";
import { ApiConsole } from "./api-console";
import { PLAN_LIMITS } from "@/lib/entitlements";

// 07 — API (P9.5-T3a: migrated onto Section/SectionHeading, copy deck v3
// head/lede/mono strip applied). Doorway points at a real, already-shipped
// page (/developers) — not gated behind a lib/marketing-flags.ts flag like
// the /features/* doorways elsewhere on this page (those gate on a
// per-page flag each, one per unbuilt destination — see that file's own
// header comment). P9.5-T3c: the body's single
// static code block is replaced by `ApiConsole` — three tabs (Create ·
// Retarget · Analytics), each pane's request/response read straight from
// `lib/api-reference.ts` (the same data /developers renders), server-
// highlighted at build. Nothing here is invented.
export function ApiSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section id="api" variant="split" surface="tint" divider="none">
      <SectionHeading
        eyebrow="API"
        index={index}
        title="Automate with our API."
        lede="Create, retarget, pause, measure: the whole surface, owner-scoped to a key."
        titleSize={titleSize}
        className="mb-10"
      />

      <SectionBody className="max-w-4xl">
        <ApiConsole />
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
