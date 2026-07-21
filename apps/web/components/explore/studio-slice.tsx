"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { renderQr, scannabilityReport } from "@qrcdn/qr-engine";
import { parseQrStyle } from "@qrcdn/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { brandQrBackdrop, brandQrStyles, type Brand } from "@/lib/explore";
import { cn } from "@/lib/utils";

const DOT_STYLES = ["square", "rounded", "circle"] as const;
const EYE_FRAMES = ["square", "rounded", "circle", "leaf"] as const;

function DotSwatch({ style }: { style: (typeof DOT_STYLES)[number] }) {
  const r = style === "circle" ? 45 : style === "rounded" ? 28 : 6;
  return (
    <svg viewBox="0 0 100 100" className="size-5" aria-hidden>
      {[0, 1, 2].flatMap((y) =>
        [0, 1, 2].map((x) =>
          (x + y) % 2 === 0 ? (
            <rect
              key={`${x}${y}`}
              x={x * 34}
              y={y * 34}
              width={30}
              height={30}
              rx={(r / 100) * 30}
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function EyeSwatch({ frame }: { frame: (typeof EYE_FRAMES)[number] }) {
  const rx = frame === "circle" ? 50 : frame === "rounded" ? 30 : frame === "leaf" ? 30 : 0;
  return (
    <svg viewBox="0 0 100 100" className="size-5" aria-hidden>
      <rect
        x={6}
        y={6}
        width={88}
        height={88}
        rx={rx === 30 ? 26 : rx === 50 ? 44 : 0}
        fill="none"
        stroke="currentColor"
        strokeWidth={13}
        {...(frame === "leaf" ? { style: { clipPath: "none" } } : {})}
      />
      <rect x={34} y={34} width={32} height={32} rx={rx === 50 ? 16 : rx === 30 ? 8 : 0} fill="currentColor" />
    </svg>
  );
}

export function StudioSlice({ brand }: { brand: Brand }) {
  const { resolvedTheme } = useTheme();
  const base = brandQrStyles[brand];

  // Theme-dependent output must wait for mount — SSR doesn't know the
  // resolved color scheme and would hydrate mismatched markup.
  const mounted = useMounted();

  const [dotStyle, setDotStyle] = useState<(typeof DOT_STYLES)[number]>(
    base.light.dots.style,
  );
  const [eyeFrame, setEyeFrame] = useState<(typeof EYE_FRAMES)[number]>(
    base.light.eyes.frame,
  );
  const [sizeRatio, setSizeRatio] = useState(base.light.dots.sizeRatio);

  const { svg, report } = useMemo(() => {
    const dark = mounted && resolvedTheme === "dark";
    const variant = dark ? base.dark : base.light;
    const style = parseQrStyle({
      ...variant,
      dots: { style: dotStyle, sizeRatio },
      eyes: { ...variant.eyes, frame: eyeFrame },
    });
    return {
      svg: renderQr({ data: "HTTPS://QRCDN.COM/K7M2X9A", style }).svg,
      report: scannabilityReport(style, {
        transparentBackdrop: brandQrBackdrop[brand][dark ? "dark" : "light"],
      }),
    };
  }, [base, brand, dotStyle, eyeFrame, sizeRatio, mounted, resolvedTheme]);

  return (
    <section className="border-b bg-surface-studio">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 max-w-xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            The studio
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight">
            Your brand&apos;s QR identity, set once
          </h2>
          <p className="mt-2 text-muted-foreground">
            Every code you generate inherits this style automatically — in the
            studio, the dashboard, and the API.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Style controls</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label>Module shape</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={dotStyle}
                  onValueChange={(v) => v && setDotStyle(v as typeof dotStyle)}
                >
                  {DOT_STYLES.map((s) => (
                    <ToggleGroupItem key={s} value={s} aria-label={s}>
                      <DotSwatch style={s} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Eye frame</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={eyeFrame}
                  onValueChange={(v) => v && setEyeFrame(v as typeof eyeFrame)}
                >
                  {EYE_FRAMES.map((f) => (
                    <ToggleGroupItem key={f} value={f} aria-label={f}>
                      <EyeSwatch frame={f} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Module size</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(sizeRatio * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.4}
                  max={1}
                  step={0.01}
                  value={[sizeRatio]}
                  onValueChange={([v]) => v !== undefined && setSizeRatio(v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Live preview</CardTitle>
              <Badge
                variant={report.score >= 80 ? "secondary" : "destructive"}
                className={cn(report.score >= 80 && "text-foreground")}
              >
                Scannability {report.score}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-qr-bg p-5">
                <div
                  aria-label="Live QR preview"
                  role="img"
                  className="[&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
              <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
                rendered client-side by the same engine as the API
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
