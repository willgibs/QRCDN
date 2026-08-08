import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { CodeBlock } from "@/components/marketing/code-block";
import { API_ENDPOINTS, type ApiEndpoint } from "@/lib/api-reference";
import { PLAN_LIMITS } from "@/lib/entitlements";
import { parseQrStyle } from "@qrcdn/shared";
import { renderPreview } from "@/lib/preview";

/**
 * 09 — API, rebuilt as "the constant print" (P9.10-D2, board-picked A-R2
 * from the C4-R2 rail direction; artifact
 * claude.ai/code/artifact/5f7abe4d-5513-46a3-8549-d282dcacf2a4). The
 * layout performs the product promise: a real printed code pins in a
 * sticky rail while the five real API verbs scroll past and operate on
 * it — none of them can ever force a reprint.
 *
 * What this retired: ProductWindow's last landing consumer (the chrome
 * window survives only on /features/analytics until that page's own
 * round) and the ApiConsoleTabs client island. The successor is no
 * island at all: the ledger is five native `<details name="api-verbs">`
 * accordions — exclusive open via the name group, Create server-rendered
 * open — so the section ships ZERO client JS (CodeBlock's CopyButton is
 * dropped via `copy={false}`; /developers keeps the buttons). All ten
 * request/response panes live in the served HTML.
 *
 * Honesty wiring, same contract as the console it replaces: every pane
 * reads from `lib/api-reference.ts` (compile-time coupled to `ApiCode`),
 * the capability grid's quota renders from `PLAN_LIMITS`, and the rail
 * mat is a deterministic engine render (QR solidity rule) of the
 * reference slug the samples themselves use — scanning the section's
 * print really resolves qrcdn.com/8K2QRX's short URL. Espresso pair
 * (#131316 on white, C2-certified), same fleet as the hero's mats.
 *
 * The grid is NOT `Section`'s `splitRail` opt-in: that primitive
 * stickies the heading column itself, and this design's heading spans
 * full width above the columns — so the body composes the same track
 * spec locally (see globals.css's splitRail comment, which records the
 * mismatch).
 */

const RAIL_PAYLOAD = "HTTPS://QRCDN.COM/8K2QRX";

const RAIL_MAT_SVG = renderPreview(
  RAIL_PAYLOAD,
  parseQrStyle({
    v: 1,
    dots: { style: "rounded", sizeRatio: 0.88 },
    eyes: { frame: "rounded", pupil: "rounded", color: null },
    fill: { type: "solid", color: "#131316" },
    background: { transparent: false, color: "#ffffff" },
  }),
).svg;

/** Ledger order: the story leads with Create (open), then the read
 *  verbs, the retarget, the measurement. Each `fact` is the one-line
 *  receipt shown while its verb is closed — a fragment of that
 *  endpoint's own response sample above it, never an invented number. */
const LEDGER: Array<{ id: string; fact: string }> = [
  { id: "create-code", fact: '201 · "url": "https://qrcdn.com/…"' },
  { id: "list-codes", fact: '"codes": [ … ] newest first' },
  { id: "get-code", fact: '"scanCount": 142' },
  { id: "update-code", fact: '"destination": "…/new-promo"' },
  { id: "code-analytics", fact: '"today": { "scans": 3 }' },
];

function endpointById(id: string): ApiEndpoint {
  const endpoint = API_ENDPOINTS.find((e) => e.id === id);
  if (!endpoint) throw new Error(`no API_ENDPOINTS entry for "${id}"`);
  return endpoint;
}

/* Line icons for the capability grid — v1 per the media pipeline's
   placeholder-first protocol (own-SVG attempt before any board asset
   request): 16-grid, 1.5 stroke, currentColor, geometry only. */
function FeatureIcon({ d, extra }: { d: string; extra?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
      {extra}
    </svg>
  );
}

const FEATURES: Array<{ icon: ReactNode; name: string; desc: string }> = [
  {
    icon: <FeatureIcon d="M9.9 6.1a2.7 2.7 0 1 0-3.8 3.8L2.8 13.2V14h1.6l.7-.7v-1h1v-1h1l.9-.9a2.7 2.7 0 0 0 1.9-4.3Z" extra={<circle cx="9.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />} />,
    name: "Scoped keys",
    desc: "Bearer auth: a key only ever sees its own codes.",
  },
  {
    // Quota renders from entitlements.ts (hard rule) — never hand-typed.
    icon: <FeatureIcon d="M2.8 11.4a5.6 5.6 0 0 1 10.4 0M8 10.6l2.3-3.4" extra={<circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />} />,
    name: `${PLAN_LIMITS.pro.apiMonthlyRequests?.toLocaleString("en-US")} req/mo`,
    desc: "Pro's monthly API allowance, metered per key.",
  },
  {
    icon: <FeatureIcon d="M5.8 2.8c-1.2 0-1.5.7-1.5 1.7v1.4c0 .9-.5 1.5-1.3 1.6.8.1 1.3.7 1.3 1.6v1.4c0 1 .3 1.7 1.5 1.7M10.2 2.8c1.2 0 1.5.7 1.5 1.7v1.4c0 .9.5 1.5 1.3 1.6-.8.1-1.3.7-1.3 1.6v1.4c0 1-.3 1.7-1.5 1.7" />,
    name: "Style JSON",
    desc: "Send a full style on create; the code freezes to it.",
  },
  {
    icon: <FeatureIcon d="M6.6 9.4l2.8-2.8M7.4 4.6l1.2-1.2a2.4 2.4 0 0 1 3.4 3.4L10.8 8M8.6 11.4l-1.2 1.2a2.4 2.4 0 0 1-3.4-3.4L5.2 8" />,
    name: "Kit attach",
    desc: "Omit style and the code follows your default kit's edits.",
  },
  {
    // 4-17 print-safe chars: mirrors lib/slug.ts's MAX_SLUG_LENGTH (D12
    // as amended) — grep MAX_SLUG_LENGTH before changing, same note as
    // lib/api-reference.ts's own hand-typed 17.
    icon: <FeatureIcon d="M2.8 3.2h4.3l6 6a1.35 1.35 0 0 1 0 1.9l-2.4 2.4a1.35 1.35 0 0 1-1.9 0l-6-6V3.2Z" extra={<circle cx="5.5" cy="5.9" r="0.9" fill="currentColor" stroke="none" />} />,
    name: "Vanity slugs",
    desc: "Pro: choose the printed path, 4 to 17 print-safe characters.",
  },
  {
    icon: <FeatureIcon d="M6 4.6v6.8M10 4.6v6.8" />,
    name: "Pause and resume",
    desc: "One PATCH stops scans; resume whenever you like.",
  },
  {
    icon: <FeatureIcon d="M8 5v3.2l2.3 2.1" extra={<circle cx="8" cy="8" r="5.4" />} />,
    name: "Expiry control",
    desc: "Set or clear expiresAt; immediate expiry is legitimate.",
  },
  {
    icon: <FeatureIcon d="M8 2.6l4.9 1.8V8c0 2.9-2 4.8-4.9 5.7C5.1 12.8 3.1 10.9 3.1 8V4.4L8 2.6Z" />,
    name: "Private 404s",
    desc: "Not-found never reveals whether a code exists or is merely not yours.",
  },
];

function CropMarks() {
  return (
    <>
      <span aria-hidden className="absolute -left-2 -top-2 size-[11px] border-l border-t border-white/35" />
      <span aria-hidden className="absolute -right-2 -top-2 size-[11px] border-r border-t border-white/35" />
      <span aria-hidden className="absolute -bottom-2 -left-2 size-[11px] border-b border-l border-white/35" />
      <span aria-hidden className="absolute -bottom-2 -right-2 size-[11px] border-b border-r border-white/35" />
    </>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="api-chev size-3.5 shrink-0 text-white/45">
      <path
        d="M3 5.5L7 9.5L11 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
        title="Automate with our API"
        lede="Create, retarget, pause, measure: the whole surface, owner-scoped to a key."
        titleSize={titleSize}
        className="mb-6"
      />

      <SectionBody className="mb-12">
        <Button asChild>
          <Link href="/developers">Read the docs</Link>
        </Button>
      </SectionBody>

      {/* reveal={false}: the rail is position:sticky, and a scroll-reveal
          wrapper animating transform would smear the pin while it plays —
          the working grid renders steady, the accordion is the motion. */}
      <SectionBody
        reveal={false}
        className="grid gap-10 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-12"
      >
        <aside className="md:sticky md:top-20 md:self-start">
          <div data-slot="api-mat" className="relative w-[15.5rem] max-w-full">
            <CropMarks />
            <div
              className="rounded-[11px] bg-white p-2.5 shadow-[0_2px_6px_-2px_oklch(0_0_0/0.55),0_30px_70px_-26px_oklch(0_0_0/0.85)] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full [&_svg]:rounded-[5px]"
              dangerouslySetInnerHTML={{ __html: RAIL_MAT_SVG }}
            />
          </div>

          <div className="lit-stroke mt-6 w-[15.5rem] max-w-full rounded-xl bg-white/[0.04]">
            <div className="px-4 py-3">
              <div className="mb-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/25">
                Short URL
              </div>
              <div className="font-mono text-code text-foreground">qrcdn.com/8K2QRX</div>
            </div>
            <div className="border-t border-white/[0.06] px-4 py-3">
              <div className="mb-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/25">
                Destination
              </div>
              <div className="font-mono text-[0.8125rem] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                https://example.com/promo
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
              <div>
                <div className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/25">
                  Status
                </div>
                {/* the dot borrows --code-string (Vercel green) so the
                    section carries exactly one green, board note: the
                    active dot reads as a live light */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-[0.6875rem] text-white/80">
                  <span aria-hidden className="size-[5px] rounded-full bg-(--code-string)" />
                  active
                </span>
              </div>
              <div className="text-right">
                <div className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/25">
                  Printed
                </div>
                {/* the reference code's createdAt date, same sample */}
                <div className="font-mono text-[0.6875rem] text-muted-foreground">2026-07-01</div>
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-[16.5rem] text-[0.85rem] leading-normal text-white/45">
            Printed once. Every verb on the right operates on it; none of them can ever make you
            reprint it.
          </p>
        </aside>

        <div className="api-ledger flex min-w-0 flex-col gap-3.5">
          {LEDGER.map(({ id, fact }) => {
            const endpoint = endpointById(id);
            return (
              <details key={id} className="api-verb" name="api-verbs" open={id === "create-code"}>
                <summary className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-4 py-3.5">
                  <span className="lit-stroke rounded-[7px] bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-foreground">
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-code text-foreground">
                    /api/v1{endpoint.path}
                  </code>
                  <span className="ml-auto flex items-center gap-2 self-center">
                    <span className="api-fact max-w-[16rem] text-right font-mono text-[0.6875rem] leading-snug text-white/45">
                      {fact}
                    </span>
                    <Chevron />
                  </span>
                  <span className="basis-full text-[0.8125rem] text-muted-foreground">
                    {endpoint.description}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <CodeBlock
                    copy={false}
                    className="lit-stroke border-0"
                    code={endpoint.request.code}
                    lang={endpoint.request.lang}
                    title="Request"
                  />
                  <CodeBlock
                    copy={false}
                    className="lit-stroke border-0"
                    code={endpoint.response.code}
                    lang={endpoint.response.lang}
                    title="Response"
                  />
                </div>
              </details>
            );
          })}
        </div>
      </SectionBody>

      <SectionBody
        delay={0.15}
        className="mt-16 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature) => (
          <div key={feature.name} data-slot="api-feature" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span className="lit-stroke flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.04] text-foreground/80">
                {feature.icon}
              </span>
              <span className="text-sm font-medium text-foreground">{feature.name}</span>
            </div>
            <p className="text-[0.8125rem] leading-normal text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </SectionBody>
    </Section>
  );
}
