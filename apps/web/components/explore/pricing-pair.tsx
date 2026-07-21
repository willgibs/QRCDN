import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { brandCopy, type Brand } from "@/lib/explore";
import { Eyebrow, ModuleMark, Reveal } from "./magic";

const freeFeatures = [
  "Unlimited static codes, full studio",
  "3 dynamic codes — free forever",
  "Unlimited scans, always retargetable",
  "1 brand kit · 30-day analytics",
];

const proFeatures = [
  "250 dynamic codes, unlimited brand kits",
  "Full analytics — history, city-level geo, devices",
  "Style-aware API · bulk generation",
  "Expiry, passwords & vanity short links",
];

export function PricingPair({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Reveal className="mb-10 max-w-xl">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Honest pricing. Codes that never die.
          </h2>
          <p className="mt-2 text-muted-foreground">
            We cap features, never your printed codes. Downgrade anytime — every
            code keeps redirecting.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">Free</CardTitle>
              <p className="font-display text-4xl font-bold">
                $0
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  forever
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {freeFeatures.map((f) => (
                <p key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </p>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Start free
              </Button>
            </CardFooter>
          </Card>

          <div className="rounded-[calc(var(--radius)+13px)] bg-gradient-to-b from-primary/45 via-border/70 to-border/30 p-px shadow-2xl shadow-primary/15">
            <Card className="border-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl">Pro</CardTitle>
                  <Badge>4 months free annually</Badge>
                </div>
                <p className="font-display text-4xl font-bold">
                  $12
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo · or $96/yr
                  </span>
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {proFeatures.map((f) => (
                  <p key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                  </p>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full">{copy.proCta}</Button>
              </CardFooter>
            </Card>
          </div>
        </Reveal>

        <div className="mt-6 flex max-w-3xl items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-5 py-4">
          <ModuleMark className="size-3 shrink-0 text-primary" />
          <p className="font-mono text-xs text-muted-foreground">
            Downgrade anytime — every printed code keeps redirecting.{" "}
            <span className="text-foreground">Forever.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
