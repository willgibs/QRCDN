"use client";

import { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { scannabilityReport } from "@qrcdn/qr-engine";
import { defaultQrStyle, parseQrStyle, type QrStyle } from "@qrcdn/shared";
import type { BrandKit } from "@/app/(app)/studio/actions";
import type { DynamicCodeSummary, QrCode } from "@/app/(app)/studio/code-actions";
import type { Plan } from "@/lib/entitlements";
import { useMounted } from "@/hooks/use-mounted";
import { degreesToRadians } from "@/lib/angle";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";
import { brandQrBackdrop } from "@/lib/explore";
import {
  LOGO_PADDING_DEFAULT,
  LOGO_SIZE_RATIO_DEFAULT,
  isLogoDataUri,
  readFileAsDataUri,
} from "@/lib/logo";
import { PREVIEW_PAYLOAD_DEFAULT, renderPreview } from "@/lib/preview";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { printedShortUrl } from "@/lib/short-url";
import { TopBar } from "./top-bar";
import { ControlsRail } from "./controls-rail";
import { PreviewStage } from "./preview-stage";

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
  initialCodes,
  plan,
  userId,
}: {
  initialKits: BrandKit[];
  initialCodes: DynamicCodeSummary[];
  /** P7.5-U2: threaded down to CodesList's access-controls dialog, which
   *  needs it to render the Pro-lock affordance for free-plan callers
   *  (mirroring components/codes/range-selector.tsx's own lock pattern).
   *  P7.5-U3 threads the same prop on through ControlsRail to
   *  CreateCodeControl too, for its vanity-slug Pro lock. */
  plan: Plan;
  userId: string;
}) {
  const [kits, setKits] = useState<BrandKit[]>(initialKits);
  const [activeKitId, setActiveKitId] = useState<string | null>(initialKits[0]?.id ?? null);
  const [style, setStyle] = useState<QrStyle>(() => styleFromKit(initialKits[0]));
  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_DEFAULT);
  const [codes, setCodes] = useState<DynamicCodeSummary[]>(initialCodes);
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

  // Dynamic-code handlers (P5-U4) — same ownership split as the brand-kit
  // handlers above: CreateCodeControl/CodesList call the P5-U1 server
  // actions themselves and bubble up only the successful result; this shell
  // owns the canonical `codes` array plus the working payload/style that a
  // creation or "Load in studio" swaps.
  const handleCodeCreated = useCallback((code: QrCode, shortUrl: string) => {
    // createDynamicCodeCore returns the FULL row (QrCode), including the raw
    // expires_at/password_hash columns (always null at creation — there's no
    // create-time access-controls input) — mapped down to the summary shape
    // explicitly here rather than spread, so the raw password_hash column
    // name never lands on `codes` state even transiently (P7.5-U2's
    // DynamicCodeSummary invariant, codes-core.ts).
    setCodes((prev) => [
      {
        id: code.id,
        slug: code.slug,
        name: code.name,
        destination_url: code.destination_url,
        status: code.status,
        scan_count: code.scan_count,
        created_at: code.created_at,
        expiresAt: code.expires_at,
        passwordProtected: code.password_hash !== null,
      },
      ...prev,
    ]);
    // The product moment (P5-U4 spec): the preview payload switches to the
    // real short URL so the artifact on stage becomes the live, printable
    // code instead of a preview of the raw destination.
    setPayload(shortUrl);
  }, []);

  const handleCodeLoad = useCallback((code: DynamicCodeSummary, loadedStyle: QrStyle) => {
    setPayload(printedShortUrl(code.slug));
    // A COPY into the working editor, never a live binding back to the
    // frozen row (D5) — editing further and saving to a brand kit (or
    // minting a new code) never touches this code's own `style` column.
    setStyle(loadedStyle);
  }, []);

  const handleCodeRetargeted = useCallback((id: string, destinationUrl: string) => {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, destination_url: destinationUrl } : c)));
  }, []);

  const handleCodePauseToggled = useCallback((id: string, status: string) => {
    setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const handleCodeAccessUpdated = useCallback(
    (id: string, patch: { expiresAt: string | null; passwordProtected: boolean }) => {
      setCodes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [],
  );

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

  // Solid <-> Gradient (founder note 3.1). Switching to Gradient seeds both
  // stops with the current ink color so the swap is visually silent until
  // the user actually edits Start/End; switching back to Solid keeps
  // whichever color was in the first stop ("glow inkHex stays first-stop").
  // A pre-existing radialGradient (unreachable via this UI, but schema-legal)
  // is handled defensively rather than discarded.
  const setFillType = useCallback((mode: "solid" | "gradient") => {
    setStyle((s) => {
      const currentColor = inkHexFromStyle(s);
      if (mode === "solid") {
        return { ...s, fill: { type: "solid", color: currentColor } };
      }
      if (s.fill.type === "linearGradient") return s;
      const stops =
        s.fill.type === "radialGradient"
          ? s.fill.stops
          : [
              { offset: 0, color: currentColor },
              { offset: 1, color: currentColor },
            ];
      return { ...s, fill: { type: "linearGradient", rotation: 0, stops } };
    });
  }, []);

  // Start = first stop, End = last stop — covers the (UI-unreachable) 3-4
  // stop case sanely instead of assuming exactly 2.
  const setGradientStart = useCallback((hex: string) => {
    setStyle((s) => {
      if (s.fill.type === "solid") return s;
      const stops = [...s.fill.stops];
      stops[0] = { ...stops[0], color: hex };
      return { ...s, fill: { ...s.fill, stops } };
    });
  }, []);
  const setGradientEnd = useCallback((hex: string) => {
    setStyle((s) => {
      if (s.fill.type === "solid") return s;
      const stops = [...s.fill.stops];
      const lastIndex = stops.length - 1;
      stops[lastIndex] = { ...stops[lastIndex], color: hex };
      return { ...s, fill: { ...s.fill, stops } };
    });
  }, []);
  // Degrees enter/leave the style at this boundary (lib/angle.ts) — the
  // schema field itself is radians (qr-engine.md: consumed via quantized
  // Math.cos/sin at render time).
  const setGradientRotationDegrees = useCallback((degrees: number) => {
    setStyle((s) => {
      if (s.fill.type !== "linearGradient") return s;
      return { ...s, fill: { ...s.fill, rotation: degreesToRadians(degrees) } };
    });
  }, []);

  // null = inherit the foreground fill (packages/shared/src/style.ts
  // `eyes.color` comment) — "Match ink" clears back to that, exactly the
  // schema's own inherit semantics rather than copying the current ink hex.
  const setEyeColor = useCallback((hex: string | null) => {
    setStyle((s) => ({ ...s, eyes: { ...s.eyes, color: hex } }));
  }, []);

  const setPaperTransparent = useCallback((transparent: boolean) => {
    setStyle((s) => ({ ...s, background: { ...s.background, transparent } }));
  }, []);

  const setEcc = useCallback((value: QrStyle["ecc"]) => {
    setStyle((s) => ({ ...s, ecc: value }));
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

  // Never throws (lib/preview.ts) — when `previewData` can't be encoded
  // (e.g. over QR capacity), `error` is set and `svg` is an explicitly
  // placeholder render, never silently passed off as a render of the
  // attempted payload (P4-U4 red-team finding: this used to swap in the
  // placeholder with no indication at all, while the scannability chip kept
  // reporting "Scannable").
  const { svg, error: renderError, version } = useMemo(
    () => renderPreview(previewData, validStyle, logoDataUri),
    [previewData, validStyle, logoDataUri],
  );

  // Theme-dependent output must wait for mount (hooks/use-mounted.ts) — SSR
  // doesn't know the resolved color scheme. `brandQrBackdrop.precision` is
  // studio-slice.tsx's own transparentBackdrop source, duplicated here for
  // the same reason lib/explore.ts's own comment documents: it must match
  // --qr-bg in globals.css by hand, there's no build-time check yet.
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  // Wired truthfully (P4 design-iteration note 3.3): when background.transparent
  // is on, the report should score contrast against what the code will
  // actually sit on in this preview — the mat's --qr-bg fallback — not the
  // guardrail's own white default, which would under-report risk in dark mode.
  const report = useMemo(
    () =>
      scannabilityReport(validStyle, {
        transparentBackdrop: brandQrBackdrop.precision[dark ? "dark" : "light"],
      }),
    [validStyle, dark],
  );

  // Shared derivation (lib/qr-style-derive.ts) — feeds ArtifactStage's
  // ambient bloom (via PreviewStage) so the glow re-hues live with the
  // kit's own ink color; the same helper also drives controls-rail's Ink
  // swatch value and kit-bar's pill/menu ModuleMark tint.
  const inkHex = inkHexFromStyle(validStyle);
  // The mat's own background: the schema color normally, or the studio
  // surface's --qr-bg bridge token when background.transparent is on (the
  // fallback preview-stage.tsx's own doc comment always planned for).
  const paperHex = validStyle.background.transparent ? "var(--qr-bg)" : validStyle.background.color;

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
    <>
      <TopBar
        kits={kits}
        activeKitId={activeKitId}
        currentStyle={validStyle}
        userId={userId}
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
          effectiveEcc={report.effectiveEcc}
          codes={codes}
          plan={plan}
          onPayloadChange={setPayload}
          onCodeCreated={handleCodeCreated}
          onCodeLoad={handleCodeLoad}
          onCodeRetargeted={handleCodeRetargeted}
          onCodePauseToggled={handleCodePauseToggled}
          onCodeAccessUpdated={handleCodeAccessUpdated}
          onInkChange={setInk}
          onPaperChange={setPaper}
          onFillTypeChange={setFillType}
          onGradientStartChange={setGradientStart}
          onGradientEndChange={setGradientEnd}
          onGradientRotationChange={setGradientRotationDegrees}
          onDotStyleChange={setDotStyle}
          onEyeFrameChange={setEyeFrame}
          onEyeColorChange={setEyeColor}
          onPaperTransparentChange={setPaperTransparent}
          onEccChange={setEcc}
          onLogoFileSelected={handleLogoFileSelected}
          onLogoRemove={handleLogoRemove}
          onLogoSizeChange={handleLogoSizeChange}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
        />
        <PreviewStage
          className="order-1 lg:order-2 lg:sticky lg:top-[89px] lg:h-[calc(100vh-121px)] lg:flex-1 lg:self-start"
          svg={svg}
          payload={previewData}
          report={report}
          version={version}
          transparentBackground={validStyle.background.transparent}
          renderError={renderError}
          inkHex={inkHex}
          paperHex={paperHex}
        />
      </main>
    </>
  );
}
