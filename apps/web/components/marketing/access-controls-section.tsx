import type { ComponentProps, ReactNode } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { Note } from "@/components/marketing/note";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { ACCESS_CONTROLS_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { PLAN_LIMITS } from "@/lib/entitlements";

/**
 * 06 — Access controls. THE THREE DOORS since P9.10-D14 (the board's pick
 * from the R1 three-variation exploration, shipped full-width at its note:
 * "use the full width for the 3 cards with breathing room between rather
 * than crunched in center").
 *
 * The section is told from the SCANNER'S side of the glass: three phones
 * showing the three things a scan can meet — forwarded, the password gate,
 * the neutral page. It is the landing's one deliberately STILL section
 * between 05's switchboard and 07's analytics window (the rhythm break),
 * and the page's first phone idiom. Zero client JS.
 *
 * EVERY CLAIM IS TRACEABLE, and the mirrors are copy-mirrored from the
 * real routes so they cannot drift into fiction:
 *
 * - Door 2 mirrors `app/p/[slug]/page.tsx` + `unlock-form.tsx` (heading,
 *   subline, route label, masked input, Continue). Password is scrypt and
 *   checked SERVER-SIDE, never "at the edge" — the caption says so. The
 *   gate page's "your code never dies" footer is deliberately NOT
 *   mirrored: that sentence has a count-1 visible-<p> e2e pin owned by
 *   the page's ending.
 * - Door 3 mirrors `app/u/[slug]/page.tsx`, and its caption states the
 *   honest twist out loud: paused, expired, and unclaimed codes land on
 *   the SAME page, indistinguishable by design — a scan never reveals
 *   why. (The /u route's own doc comment calls this the point.)
 * - Door 1 is the pass-through: 302 · no-store, never cached (the
 *   CLAUDE.md redirect rule).
 * - Plan tags derive from `PLAN_LIMITS` (the entitlements rule). Pause is
 *   genuinely free: `setCodePausedCore` has no plan gate.
 * - NOT CLAIMED: scheduling, API password-set, brute-force protection.
 *   The Note carries the honest limit, verbatim from the first pass.
 */

const DEMO_SLUG = "K7M2X9A";
const PRO_ONLY = PLAN_LIMITS.free.accessControls ? "Free" : "Pro";

function PlanTag({ plan }: { plan: string }) {
  return (
    <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
      {plan}
    </span>
  );
}

/** The phone frame: the scanner's own device as the stage. Chrome is
 *  decoration (aria-hidden speaker slot); the page content inside is real
 *  readable text. */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[264px] rounded-[2.1rem] border border-border/70 bg-card/40 p-2.5 shadow-xl shadow-black/30">
      <div className="flex h-[380px] flex-col overflow-hidden rounded-[1.55rem] border border-border/40 bg-background">
        <div aria-hidden className="flex items-center justify-center pt-2.5 pb-3">
          <span className="h-[5px] w-14 rounded-full bg-muted-foreground/20" />
        </div>
        {children}
      </div>
    </div>
  );
}

function DoorCaption({
  rows,
  note,
}: {
  rows: ReadonlyArray<{ name: string; plan?: string }>;
  note: string;
}) {
  return (
    <div className="mt-6 text-center">
      <div className="flex items-baseline justify-center gap-2.5">
        {rows.map((r, i) => (
          <span key={r.name} className="flex items-baseline gap-1.5">
            {i > 0 && <span className="text-muted-foreground/50">·</span>}
            <h3 className="font-display text-sm font-semibold">{r.name}</h3>
            {r.plan && <PlanTag plan={r.plan} />}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}

export function AccessControlsSection({
  index,
  titleSize,
}: {
  index: string;
  titleSize?: ComponentProps<typeof SectionHeading>["titleSize"];
}) {
  return (
    <Section variant="split" divider="none">
      <SectionHeading
        eyebrow="Access controls"
        index={index}
        title="Control who can visit"
        lede="Put a password on a code, give it an end date, or pause it outright. The printed code never changes. What changes is who gets through."
        titleSize={titleSize}
        className="mb-12"
      />

      {/* The doors ride the FULL measure (the board's R2 note): three
          columns across the page width, the room between them doing the
          composing. Below sm they stack. */}
      <SectionBody>
        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-x-16">
          {/* Door 1: all clear — the pass-through. */}
          <div>
            <Phone>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
                <span aria-hidden className="grid size-10 place-items-center rounded-full bg-ok/15">
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4 text-ok"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 8.5 6 12l7.5-8" />
                  </svg>
                </span>
                <p className="text-sm font-semibold text-foreground">Forwarded.</p>
                <p className="font-mono text-[11px] text-muted-foreground">302 · no-store</p>
              </div>
            </Phone>
            <DoorCaption
              rows={[{ name: "All clear" }]}
              note="No controls in the way. The scan forwards in one hop, never cached."
            />
          </div>

          {/* Door 2: the gate, mirrored from app/p/[slug] + unlock-form. */}
          <div>
            <Phone>
              <div className="flex flex-1 flex-col justify-center gap-4 px-5 pb-4">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    This code is password-protected.
                  </p>
                  <p className="text-xs text-muted-foreground">Enter the password to continue.</p>
                </div>
                <p className="text-center font-mono text-[10px] text-muted-foreground/70">
                  /p/{DEMO_SLUG}
                </p>
                <div className="flex flex-col gap-2" aria-hidden>
                  <span className="flex h-8 items-center justify-center rounded-md border border-input bg-card/60 font-mono text-xs text-muted-foreground/60">
                    ••••••••
                  </span>
                  <span className="flex h-8 items-center justify-center rounded-md bg-primary text-[11px] font-medium text-primary-foreground">
                    Continue
                  </span>
                </div>
              </div>
            </Phone>
            <DoorCaption
              rows={[{ name: "Password", plan: PRO_ONLY }]}
              note="Hashed with scrypt, checked server-side. The destination never appears in the gate's HTML."
            />
          </div>

          {/* Door 3: the neutral page, mirrored from app/u/[slug]. */}
          <div>
            <Phone>
              <div className="flex flex-1 flex-col justify-center gap-4 px-5 pb-4">
                <div className="flex flex-col gap-1.5 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    This code isn&apos;t live right now.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The person who printed it may have paused it, or it hasn&apos;t been claimed
                    yet.
                  </p>
                </div>
                <p className="text-center font-mono text-[10px] text-muted-foreground/70">
                  /u/{DEMO_SLUG}
                </p>
                <span
                  aria-hidden
                  className="mx-auto flex h-8 w-fit items-center justify-center rounded-md bg-primary px-3 text-[11px] font-medium text-primary-foreground"
                >
                  Create a code that never dies
                </span>
              </div>
            </Phone>
            <DoorCaption
              rows={[
                { name: "Pause", plan: "Free" },
                { name: "Expiry", plan: PRO_ONLY },
              ]}
              note="Paused and expired codes park here, indistinguishable from unclaimed ones. By design: a scan never reveals why."
            />
          </div>
        </div>
      </SectionBody>

      <SectionBody delay={0.15} className="mt-12 flex flex-col items-center gap-5">
        <div className="max-w-2xl">
          <Note lead="A gate, not a vault.">
            A password stops a scan from forwarding. It does not make the destination secret: once
            someone gets through, the address is in their browser and they can pass it on. Unlock
            attempts are throttled, which is an abuse backstop rather than a lock.
          </Note>
        </div>
        {ACCESS_CONTROLS_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/access-controls">Explore access controls</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
