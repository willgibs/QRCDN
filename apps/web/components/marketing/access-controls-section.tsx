import type { ComponentProps } from "react";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { MonoStrip } from "@/components/marketing/mono-strip";
import { Note } from "@/components/marketing/note";
import { LearnMoreLink } from "@/components/marketing/learn-more-link";
import { StateCards } from "@/components/marketing/state-cards";
import { ACCESS_CONTROLS_DOORWAY_ENABLED } from "@/lib/marketing-flags";
import { PLAN_LIMITS } from "@/lib/entitlements";

/**
 * 06 — Access controls (P9.7-V4, new section).
 *
 * The state cards moved here from section 05. They were always an
 * access-control story, and living in 05 they were squeezed into a 280px
 * sidebar beside `RetargetTheatre`: the one visitor-driven moment on the page
 * rendered smaller than a static dashboard mock two sections later. Giving
 * access controls its own section fixes both ends at once, and 05 gets its
 * full width back.
 *
 * EVERY CLAIM BELOW IS TRACEABLE, and several nearby claims are deliberately
 * NOT made, because they would be false:
 *
 * - Password is scrypt (N=2^15, per-password salt, `timingSafeEqual`), and
 *   the hash never crosses the server boundary. But it is verified IN THE APP,
 *   not at the edge: the Worker only decides that a gate is needed and 302s to
 *   /p/{SLUG}. "Checked at the edge" would be false, so the copy says
 *   server-side, matching what /features/access-controls already says.
 * - Expiry genuinely IS edge-enforced, in the same KV lookup that routes the
 *   scan, compared against wall-clock now so a cached record still expires on
 *   time. That one gets to say "at the edge".
 * - Pause has no plan gate at all (`setCodePausedCore` checks nothing), so it
 *   is free on every plan. That is worth saying out loud next to two Pro rows.
 * - NOT CLAIMED: scheduling (no `starts_at` column exists anywhere), setting a
 *   password over the API (only expiry is settable; the API can report
 *   `passwordProtected` but not change it), and anything resembling
 *   brute-force protection. Unlock attempts are throttled at 8 per 300s,
 *   fixed-window, and the check fails open on error. That is an abuse
 *   backstop, not a security control, and the Note below says so.
 */

/** Pro/Free derived from entitlements rather than typed twice. Pause carries
 *  no entitlement field because it genuinely has no plan gate. */
const PRO_ONLY = PLAN_LIMITS.free.accessControls ? "Free" : "Pro";

const CONTROLS = [
  {
    name: "Password",
    plan: PRO_ONLY,
    claim: "Scanners meet a gate before they forward.",
    detail:
      "Hashed with scrypt and checked server-side. The hash never reaches the edge, and the destination never appears in the gate's HTML.",
  },
  {
    name: "Expiry",
    plan: PRO_ONLY,
    claim: "Give a code an end date.",
    detail:
      "Enforced at the edge, in the same lookup that routes the scan. Clear or extend it and the code picks up exactly where it left off, password and all.",
  },
  {
    name: "Pause",
    plan: "Free",
    claim: "A switch, not a deletion.",
    detail:
      "Parks every scanner on a neutral page until you resume. Nothing is lost, the print stays honest, and it is free on every plan.",
  },
] as const;

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
        title="Control who can visit."
        lede="Put a password on a code, give it an end date, or pause it outright. The printed code never changes. What changes is who gets through."
        titleSize={titleSize}
        className="mb-10"
      />

      <SectionBody className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-14">
        <div>
          {CONTROLS.map((control, i) => (
            <div
              key={control.name}
              className={i === 0 ? "pb-6" : "border-t border-border py-6 last:pb-0"}
            >
              <div className="flex items-baseline gap-3">
                <h3 className="text-[1.0625rem] font-medium text-foreground">{control.name}</h3>
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {control.plan}
                </span>
              </div>
              <p className="mt-1.5 text-[0.9375rem] text-foreground">{control.claim}</p>
              <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
                {control.detail}
              </p>
            </div>
          ))}
        </div>

        {/* What a scanner actually meets. `only` renders the single card bare,
            so this column supplies its own sizing. */}
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            What a visitor sees
          </span>
          <StateCards only="password" />
          <StateCards only="unclaimed" />
        </div>
      </SectionBody>

      <SectionBody delay={0.15} className="mt-10 flex flex-col items-start gap-5">
        <Note lead="A gate, not a vault.">
          A password stops a scan from forwarding. It does not make the destination secret: once
          someone gets through, the address is in their browser and they can pass it on. Unlock
          attempts are throttled, which is an abuse backstop rather than a lock.
        </Note>
        <MonoStrip icon={false}>
          scrypt hashed · expiry enforced at the edge · pause free on every plan
        </MonoStrip>
        {ACCESS_CONTROLS_DOORWAY_ENABLED && (
          <LearnMoreLink href="/features/access-controls">Explore access controls</LearnMoreLink>
        )}
      </SectionBody>
    </Section>
  );
}
