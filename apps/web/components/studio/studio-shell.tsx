"use client";

import { useCallback, useMemo, useState } from "react";
import { renderQr, scannabilityReport } from "@qrcdn/qr-engine";
import { defaultQrStyle, parseQrStyle, type QrStyle } from "@qrcdn/shared";
import type { BrandKit } from "@/app/(app)/studio/actions";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";
import {
  LOGO_PADDING_DEFAULT,
  LOGO_SIZE_RATIO_DEFAULT,
  isLogoDataUri,
  readFileAsDataUri,
} from "@/lib/logo";
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
 * P4-U3 studio shell. Controls hold local `useState` and feed the same
 * `renderQr` call the server/export path uses — no round-trip for preview
 * (per docs/guides/p4-studio.md). Every control (payload, colors, shapes,
 * logo) is wired live; `scannabilityReport` re-runs alongside `renderQr` on
 * every style/payload change and its result feeds the preview stage's
 * status chip.
 *
 * Logo storage decision (p4-studio.md "Logo storage" + style.ts's
 * `logo.assetId` comment: "resolution to a data URI happens outside the
 * engine"): the schema models `assetId` as a bare, unconstrained string, so
 * the Studio stores the resolved data URI *directly* in `style.logo.assetId`
 * — this keeps preview rendering deterministic and round-trip-safe with zero
 * async resolution step (a kit reload needs no fetch to show its logo again)
 * at the cost of the style JSON carrying the image bytes twice (data URI +
 * the durable `brand-logos` bucket copy uploaded on save). That duplication
 * is explicitly acceptable at the 2MB logo cap.
 */
export function StudioShell({
  initialKits,
  userId,
  userEmail,
}: {
  initialKits: BrandKit[];
  userId: string;
  userEmail: string;
}) {
  const [kits, setKits] = useState<BrandKit[]>(initialKits);
  const [activeKitId, setActiveKitId] = useState<string | null>(initialKits[0]?.id ?? null);
  const [style, setStyle] = useState<QrStyle>(() => styleFromKit(initialKits[0]));
  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_DEFAULT);
  // The raw File behind a not-yet-persisted style.logo.assetId — kept only
  // so the kit bar's create/save actions can upload it to the brand-logos
  // bucket as the durable source (deliverable #2). Cleared once that upload
  // has happened (or the logo is removed / a different kit is loaded).
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  const handleSwitch = useCallback((kit: BrandKit) => {
    setActiveKitId(kit.id);
    setStyle(styleFromKit(kit));
    setPendingLogoFile(null);
  }, []);

  const handleCreated = useCallback((kit: BrandKit) => {
    setKits((prev) => [...prev, kit]);
    setActiveKitId(kit.id);
    setStyle(styleFromKit(kit));
    setPendingLogoFile(null);
  }, []);

  const handleSaved = useCallback((kit: BrandKit) => {
    setKits((prev) => prev.map((k) => (k.id === kit.id ? kit : k)));
    setPendingLogoFile(null);
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      const next = kits.filter((k) => k.id !== id);
      setKits(next);
      if (id === activeKitId) {
        const fallback = next.find((k) => k.is_default) ?? next[0] ?? null;
        setActiveKitId(fallback?.id ?? null);
        setStyle(styleFromKit(fallback));
        setPendingLogoFile(null);
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

  const handleLogoFileSelected = useCallback(async (file: File): Promise<string | null> => {
    try {
      const dataUri = await readFileAsDataUri(file);
      setPendingLogoFile(file);
      setStyle((s) => ({
        ...s,
        logo: {
          assetId: dataUri,
          sizeRatio: s.logo?.sizeRatio ?? LOGO_SIZE_RATIO_DEFAULT,
          padding: s.logo?.padding ?? LOGO_PADDING_DEFAULT,
          knockout: s.logo?.knockout ?? true,
          shape: s.logo?.shape ?? "auto",
        },
      }));
      return null;
    } catch {
      return "Could not read that file — try again.";
    }
  }, []);

  const handleLogoRemove = useCallback(() => {
    setPendingLogoFile(null);
    setStyle((s) => ({ ...s, logo: null }));
  }, []);

  const handleLogoSizeChange = useCallback((ratio: number) => {
    setStyle((s) => (s.logo ? { ...s, logo: { ...s.logo, sizeRatio: ratio } } : s));
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

  // Defense in depth (qr-engine.md): re-validate the persisted assetId shape
  // immediately before it reaches the engine, even though it can only have
  // gotten into `style.logo` via our own FileReader-produced data URI.
  const logoDataUri =
    validStyle.logo && isLogoDataUri(validStyle.logo.assetId) ? validStyle.logo.assetId : undefined;

  const svg = useMemo(() => {
    try {
      return renderQr({ data: previewData, style: validStyle, logoDataUri }).svg;
    } catch {
      return renderQr({ data: PREVIEW_PAYLOAD_DEFAULT, style: defaultQrStyle }).svg;
    }
  }, [previewData, validStyle, logoDataUri]);

  const report = useMemo(() => scannabilityReport(validStyle), [validStyle]);

  const handleExportSvg = useCallback(() => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    downloadBlob(blob, exportFilename(previewData, "svg"));
  }, [svg, previewData]);

  const handleExportPng = useCallback(
    async (size: number) => {
      const blob = await rasterizeSvgToPng(svg, size);
      downloadBlob(blob, exportFilename(previewData, "png"));
    },
    [svg, previewData],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar
        kits={kits}
        activeKitId={activeKitId}
        currentStyle={validStyle}
        userId={userId}
        userEmail={userEmail}
        pendingLogoFile={pendingLogoFile}
        onSwitch={handleSwitch}
        onCreated={handleCreated}
        onSaved={handleSaved}
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
          onLogoFileSelected={handleLogoFileSelected}
          onLogoRemove={handleLogoRemove}
          onLogoSizeChange={handleLogoSizeChange}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
        />
        <PreviewStage
          className="order-1 lg:order-2 lg:flex-1 lg:self-stretch"
          svg={svg}
          payload={previewData}
          report={report}
        />
      </main>
    </div>
  );
}
