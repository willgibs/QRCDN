import { DashboardWindow } from "./dashboard-window";
import { Eyebrow, Reveal } from "@/components/brand/magic";

export function DashboardCard() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Analytics</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Know every scan
          </h2>
          <p className="mt-2 text-muted-foreground">
            Volume, geography, and devices for every dynamic code — and the
            destination stays editable after printing.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-5xl">
          <DashboardWindow />
        </Reveal>
      </div>
    </section>
  );
}
