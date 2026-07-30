import { Eyebrow, Reveal } from "@/components/brand/magic";
import { DashboardWindow } from "./dashboard-window";

export function AnalyticsSection() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Analytics</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Know every scan.
          </h2>
          <p className="mt-2 text-muted-foreground">
            By day, country, city, device, and referrer — rolled up daily,
            honest about bots, and never storing a raw IP.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-5xl">
          <DashboardWindow />
        </Reveal>
      </div>
    </section>
  );
}
