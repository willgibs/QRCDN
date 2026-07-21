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
        <div className="mb-8 max-w-xl">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Honest pricing. Codes that never die.
          </h2>
          <p className="mt-2 text-muted-foreground">
            We cap features, never your printed codes. Downgrade anytime — every
            code keeps redirecting.
          </p>
        </div>

        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
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

          <Card className="border-primary shadow-md">
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
      </div>
    </section>
  );
}
