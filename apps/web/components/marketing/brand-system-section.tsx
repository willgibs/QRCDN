import { Eyebrow, Reveal } from "@/components/brand/magic";
import { StudioWindow } from "./studio-window";

export function BrandSystemSection() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Brand system</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            A style system, not a color picker.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Ink, paper, shapes, and logo set once as a kit — every code
            inherits it. A live scannability instrument keeps every choice
            inside what cameras can actually read.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-5xl">
          <StudioWindow />
        </Reveal>
      </div>
    </section>
  );
}
