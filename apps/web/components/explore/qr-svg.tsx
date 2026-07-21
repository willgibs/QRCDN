"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import type { QrStyle } from "@qrcdn/shared";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Client-side QR render — the same engine that runs on the server. Theme-aware:
 * picks the light/dark style variant to match the active color scheme.
 */
export function QrSvg({
  data,
  light,
  dark,
  className,
}: {
  data: string;
  light: QrStyle;
  dark: QrStyle;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const svg = useMemo(() => {
    const style = mounted && resolvedTheme === "dark" ? dark : light;
    return renderQr({ data, style }).svg;
  }, [data, light, dark, mounted, resolvedTheme]);

  return (
    <div
      className={className}
      role="img"
      aria-label={`QR code for ${data}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
