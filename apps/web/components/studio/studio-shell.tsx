"use client";

import { useCallback, useMemo, useState } from "react";
import { renderQr } from "@qrcdn/qr-engine";
import { defaultQrStyle, parseQrStyle, type QrStyle } from "@qrcdn/shared";
import type { BrandKit } from "@/app/(app)/studio/actions";
import { TopBar } from "./top-bar";
import { ControlsRail } from "./controls-rail";
import { PreviewStage } from "./preview-stage";

const PREVIEW_PAYLOAD_DEFAULT = "HTTPS://QRCDN.COM/PREVIEW";

function styleFromKit(kit: BrandKit | null | undefined): QrStyle {
  if (!kit) return defaultQrStyle;
  try {
    return parseQrStyle(kit.style);
  } catch {
    // A corrupted/unparseable snapshot never crashes the studio — it just
    // falls back to the schema default until the user edits and re-saves.
    return defaultQrStyle;
  }
}

/**
 * P4-U2 studio shell. Controls hold local `useState` and feed the same
 * `renderQr` call the server/export path uses — no round-trip for preview
 * (per docs/guides/p4-studio.md). Payload, ink/paper color, and dot/eye
 * shape are all wired live; logo upload and SVG/PNG export are intentionally
 * static stubs here — U3 wires them plus the scannability chip.
 */
export function StudioShell({
  initialKits,
  userEmail,
}: {
  initialKits: BrandKit[];
  userEmail: string;
}) {
  const [kits, setKits] = useState<BrandKit[]>(initialKits);
  const [activeKitId, setActiveKitId] = useState<string | null>(initialKits[0]?.id ?? null);
  const [style, setStyle] = useState<QrStyle>(() => styleFromKit(initialKits[0]));
  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_DEFAULT);

  const handleSwitch = useCallback((kit: BrandKit) => {
    setActiveKitId(kit.id);
    setStyle(styleFromKit(kit));
  }, []);

  const handleCreated = useCallback((kit: BrandKit) => {
    setKits((prev) => [...prev, kit]);
    setActiveKitId(kit.id);
    setStyle(styleFromKit(kit));
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      const next = kits.filter((k) => k.id !== id);
      setKits(next);
      if (id === activeKitId) {
        const fallback = next.find((k) => k.is_default) ?? next[0] ?? null;
        setActiveKitId(fallback?.id ?? null);
        setStyle(styleFromKit(fallback));
      }
    },
    [kits, activeKitId],
  );

  const handleDefaultChanged = useCallback((id: string) => {
    setKits((prev) => prev.map((k) => ({ ...k, is_default: k.id === id })));
  }, []);

  const setInk = useCallback((hex: string) => {
    setStyle((s) => ({ ...s, fill: { type: "solid", color: hex } }));
  }, []);
  const setPaper = useCallback((hex: string) => {
    setStyle((s) => ({ ...s, background: { ...s.background, color: hex } }));
  }, []);
  const setDotStyle = useCallback((value: QrStyle["dots"]["style"]) => {
    setStyle((s) => ({ ...s, dots: { ...s.dots, style: value } }));
  }, []);
  const setEyeFrame = useCallback((value: QrStyle["eyes"]["frame"]) => {
    setStyle((s) => ({ ...s, eyes: { ...s.eyes, frame: value } }));
  }, []);

  // Re-validate before every render — cheap, and it's the same guard
  // studio-slice.tsx uses before handing a style to renderQr.
  const validStyle = useMemo(() => {
    try {
      return parseQrStyle(style);
    } catch {
      return defaultQrStyle;
    }
  }, [style]);

  const previewData = payload.trim().length > 0 ? payload : PREVIEW_PAYLOAD_DEFAULT;

  const svg = useMemo(() => {
    try {
      return renderQr({ data: previewData, style: validStyle }).svg;
    } catch {
      return renderQr({ data: PREVIEW_PAYLOAD_DEFAULT, style: defaultQrStyle }).svg;
    }
  }, [previewData, validStyle]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar
        kits={kits}
        activeKitId={activeKitId}
        currentStyle={validStyle}
        userEmail={userEmail}
        onSwitch={handleSwitch}
        onCreated={handleCreated}
        onDeleted={handleDeleted}
        onDefaultChanged={handleDefaultChanged}
      />
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-8">
        <ControlsRail
          className="order-2 lg:order-1 lg:w-[300px] lg:shrink-0"
          style={validStyle}
          payload={payload}
          onPayloadChange={setPayload}
          onInkChange={setInk}
          onPaperChange={setPaper}
          onDotStyleChange={setDotStyle}
          onEyeFrameChange={setEyeFrame}
        />
        <PreviewStage
          className="order-1 lg:order-2 lg:flex-1"
          svg={svg}
          payload={previewData}
        />
      </main>
    </div>
  );
}
