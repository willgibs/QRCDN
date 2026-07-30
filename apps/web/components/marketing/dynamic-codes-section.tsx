import { Clock, Lock, Pause } from "lucide-react";
import { Eyebrow, ModuleMark, Reveal } from "@/components/brand/magic";

// No dedicated framed-window harvest source for this section (unlike the
// studio/dashboard windows) — the copy deck's "never-dies retarget moment"
// is a typographic one: the big statement, three capability pills that
// visually echo the sub-copy's own "pause it, protect it, expire it" (no
// new claims, just emphasis), and the guarantee strip in the pricing-pair.tsx
// mono-strip register.
const CAPABILITIES = [
  { icon: Pause, label: "Pause" },
  { icon: Lock, label: "Protect" },
  { icon: Clock, label: "Expire" },
] as const;

export function DynamicCodesSection() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="max-w-xl">
          <Eyebrow>Dynamic codes</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Print once. Point anywhere.
          </h2>
          <p className="mt-2 text-muted-foreground">
            A QRCDN code is a permanent address. Retarget it in seconds and
            the printed code never changes. Pause it, protect it, expire it —
            it keeps redirecting even when everything else is down.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3.5 py-1.5 font-mono text-[11px] text-muted-foreground"
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal
          delay={0.1}
          className="mt-8 flex max-w-3xl items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4"
        >
          <ModuleMark className="size-3 shrink-0 text-primary" />
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground">your code never dies</span> —
            free codes are never deactivated, and a downgrade never breaks a
            printed code.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
