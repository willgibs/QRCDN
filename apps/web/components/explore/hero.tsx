import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrSvg } from "./qr-svg";
import { brandCopy, brandQrStyles, type Brand } from "@/lib/explore";

export function Hero({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];
  const qr = brandQrStyles[brand];

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold tracking-tight">
          QRCDN
        </span>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <span>Studio</span>
          <span>Pricing</span>
          <span>Docs</span>
        </div>
        <Button size="sm">{copy.ctaPrimary}</Button>
      </nav>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary">{copy.tagline}</Badge>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {copy.headline}
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">{copy.sub}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">
              {copy.ctaPrimary}
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline">
              {copy.ctaSecondary}
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            HTTPS://QRCDN.COM/K7M2X9A · your code never dies
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <QrSvg
              data="HTTPS://QRCDN.COM/K7M2X9A"
              light={qr.light}
              dark={qr.dark}
              className="[&_svg]:h-auto [&_svg]:w-full"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
