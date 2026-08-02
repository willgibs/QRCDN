"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { downloadBlob, exportFilename, rasterizeSvgToPng } from "@/lib/export";

// Same raster size as the landing playground's own PNG export
// (components/marketing/playground.tsx's PNG_EXPORT_SIZE) — no product
// reason for the two to differ, and this keeps one known-good size instead
// of inventing a second.
const PNG_EXPORT_SIZE = 1024;
const SUCCESS_RESET_MS = 1600;

/**
 * The code detail page's Export control (P9.6-U3) — a small client wrapper
 * over lib/export.ts's browser-only helpers (canvas, object URLs), which
 * can't run in the Server Component that renders this page. Same
 * Popover-trigger-with-a-brief-Check-state pattern as
 * components/marketing/playground.tsx's Download button (P9.5-T3b round),
 * reused here rather than re-invented: single "Download" trigger, SVG/PNG
 * choices inside.
 *
 * Unlike playground.tsx, this never calls `renderQr`/`renderPreview`
 * itself — `svg` is the code's frozen-style render, computed ONCE
 * server-side (app/(app)/codes/[slug]/page.tsx) and handed down as a plain
 * string prop. There's no live style to react to on this page (D5: style is
 * a frozen snapshot), so there's nothing to re-render here.
 */
export function ExportCodeMenu({ svg, name }: { svg: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justExported, setJustExported] = useState<"svg" | "png" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!justExported) return;
    const id = setTimeout(() => setJustExported(null), SUCCESS_RESET_MS);
    return () => clearTimeout(id);
  }, [justExported]);

  function handleExportSvg() {
    setError(null);
    setOpen(false);
    try {
      // `name` (the code's own given name), not its encoded payload —
      // unlike the anonymous landing playground, this code has a real name
      // a person picked, and "qrcdn-<their-name>.svg" is a far more useful
      // filename than "qrcdn-https-qrcdn-com-<slug>.svg".
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), exportFilename(name, "svg"));
      setJustExported("svg");
    } catch {
      setError("Couldn't export. Try again.");
    }
  }

  async function handleExportPng() {
    setError(null);
    setOpen(false);
    setBusy(true);
    try {
      const blob = await rasterizeSvgToPng(svg, PNG_EXPORT_SIZE);
      downloadBlob(blob, exportFilename(name, "png"));
      setJustExported("png");
    } catch {
      setError("Couldn't export. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {justExported ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
            {justExported ? "Downloaded" : "Download"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-36 p-1.5">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleExportSvg}
              className="rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted"
            >
              SVG
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={busy}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              PNG
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
