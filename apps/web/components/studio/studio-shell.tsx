"use client";

import { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { scannabilityReport } from "@qrcdn/qr-engine";
import { defaultQrStyle, parseQrStyle, type QrStyle } from "@qrcdn/shared";
import type { BrandKit } from "@/lib/brand-kits";
import type { Plan } from "@/lib/entitlements";
import { useMounted } from "@/hooks/use-mounted";
import { degreesToRadians } from "@/lib/angle";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";
import { brandQrBackdrop } from "@/lib/brand-qr";
import {
  LOGO_PADDING_DEFAULT,
  LOGO_SIZE_RATIO_DEFAULT,
  isLogoDataUri,
  readFileAsDataUri,
} from "@/lib/logo";
import { PREVIEW_PAYLOAD_WORST_CASE, renderPreview } from "@/lib/preview";
import { inkHexFromStyle } from "@/lib/qr-style-derive";
import { TopBar } from "./top-bar";
import { AnonymousBar } from "./anonymous-bar";
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
  plan,
  userId,
  anonymous = false,
}: {
  initialKits: BrandKit[];
  /** P9.8-B2: creation (and its Pro-locks) left the studio for /codes — the
   *  one remaining consumer is KitBar's free-tier kit-limit note (via
   *  TopBar), which must not show a free-tier message to a Pro caller
   *  (agent-found latent bug, kit-bar.tsx's own doc comment). */
  plan: Plan;
  /** `null` only in anonymous mode (P9.8-B4), where nothing that needs an
   *  owner ever mounts: KitBar (the sole `userId` consumer, for its logo
   *  upload path) is replaced by the AnonymousBar incentive. */
  userId: string | null;
  /** P9.8-B4: the signed-out static-code studio. Same shell, same engine,
   *  same export chain (all client-side, auth-free by construction) — the
   *  kit bar and the rail's /codes link become the page's two account
   *  incentives instead. */
  anonymous?: boolean;
}) {
  const [kits, setKits] = useState<BrandKit[]>(initialKits);
  const [activeKitId, setActiveKitId] = useState<string | null>(initialKits[0]?.id ?? null);
  const [style, setStyle] = useState<QrStyle>(() => styleFromKit(initialKits[0]));
  // Defaults to the worst-case dynamic payload (P9.8-B3, lib/preview.ts's
  // own doc comment has the full derivation), not the short marketing
  // placeholder: every code this kit ever mints — auto-generated or vanity,
  // API included — is now bounded at or under this length, so the version
  // readout and scannability chip a person sees here on first load already
  // reflect the bound their kit must survive, not an easier case.
  const [payload, setPayload] = useState(PREVIEW_PAYLOAD_WORST_CASE);
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
  // P9.8-B4 rider: dots.sizeRatio finally gets a studio control (the
  // marketing playground has had one since P9.5-T3b; the real tool never
  // did). The schema floor is 0.4 (D6) — the slider's own min enforces it
  // client-side and the zod schema re-enforces on save.
  const setDotSize = useCallback((ratio: number) => {
    setStyle((s) => ({ ...s, dots: { ...s.dots, sizeRatio: ratio } }));
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
      return "Could not read that file. Try again.";
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

  // Same worst-case fallback as the useState initial above — an
  // all-whitespace payload must not silently relax the evaluated case back
  // down to something easier than every kit is actually proven against.
  const previewData = payload.trim().length > 0 ? payload : PREVIEW_PAYLOAD_WORST_CASE;

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
  // doesn't know the resolved color scheme. `brandQrBackdrop.precision` must
  // match --qr-bg in globals.css by hand (lib/brand-qr.ts's own doc comment
  // makes the same note) — there's no build-time check yet.
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
      {anonymous || userId === null ? (
        <AnonymousBar />
      ) : (
        <TopBar
          kits={kits}
          activeKitId={activeKitId}
          currentStyle={validStyle}
          userId={userId}
          plan={plan}
          pendingLogoFile={pendingLogoFile}
          onSwitch={handleSwitch}
          onCreated={handleCreated}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onDefaultChanged={handleDefaultChanged}
        />
      )}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:gap-8 lg:px-8 lg:py-8">
        <ControlsRail
          className="order-2 lg:order-1 lg:w-[300px] lg:shrink-0"
          style={validStyle}
          payload={payload}
          effectiveEcc={report.effectiveEcc}
          anonymous={anonymous}
          inkHex={inkHex}
          paperHex={paperHex}
          onPayloadChange={setPayload}
          onInkChange={setInk}
          onPaperChange={setPaper}
          onFillTypeChange={setFillType}
          onGradientStartChange={setGradientStart}
          onGradientEndChange={setGradientEnd}
          onGradientRotationChange={setGradientRotationDegrees}
          onDotStyleChange={setDotStyle}
          onDotSizeChange={setDotSize}
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
