import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrSvg } from "./qr-svg";
import { brandCopy, brandQrStyles, type Brand } from "@/lib/explore";

export function Hero({ brand }: { brand: Brand }) {
  const copy = brandCopy[brand];
  const qr = brandQrStyles[brand];

  return (
    <header>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold tracking-tight">
          QRCDN
        </span>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <span>Studio</span>
          <span>Pricing</span>
          <span>Docs</span>
        </div>
        <Button size="sm">{copy.ctaPrimary}</Button>
      </nav>

      <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 px-6 pt-20 pb-10 text-center sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {copy.tagline}
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tighter text-balance sm:text-7xl lg:text-8xl">
          {copy.headline}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
          {copy.sub}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" className="h-12 rounded-full px-7 text-base">
            {copy.ctaPrimary}
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-full px-5 text-base text-muted-foreground"
          >
            {copy.ctaSecondary}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 pb-24">
        <div className="w-full max-w-xs rounded-3xl border border-border/60 bg-card p-7 shadow-xl shadow-foreground/5 sm:max-w-sm">
          <QrSvg
            data="HTTPS://QRCDN.COM/K7M2X9A"
            light={qr.light}
            dark={qr.dark}
            className="[&_svg]:h-auto [&_svg]:w-full"
          />
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          HTTPS://QRCDN.COM/K7M2X9A · your code never dies
        </p>
      </div>
    </header>
  );
}
