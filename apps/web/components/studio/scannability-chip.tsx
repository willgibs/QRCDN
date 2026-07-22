import type { ScannabilityReport } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";

type ChipState = "clean" | "warn" | "error";

function chipState(report: ScannabilityReport): ChipState {
  if (report.issues.some((issue) => issue.severity === "error")) return "error";
  if (report.issues.length > 0) return "warn";
  return "clean";
}

/** Compact summary line for the chip row itself — quiet metadata when
 *  clean, a state+count when there's anything to report. Full issue text
 *  never lives here (see the issue list below); this line is always short
 *  enough to never need truncation. */
function summaryText(report: ScannabilityReport, version: number | null): string {
  if (report.issues.length === 0) {
    return ["Scannable", version !== null && `V${version}`, `ECC ${report.effectiveEcc}`]
      .filter((part): part is string => Boolean(part))
      .join(" · ");
  }
  const count = report.issues.length;
  return `${count} ${count === 1 ? "issue" : "issues"}`;
}

/**
 * Live scannability instrument (P4 founder round 3, note 3) — recomputed
 * from `scannabilityReport` on every style/payload change (see
 * studio-shell.tsx). Two tiers, not a toast:
 *  - a compact summary row (fixed `h-7`, unchanged footprint from round 2)
 *    that reads as quiet metadata when clean
 *    (`● SCANNABLE · V{version} · ECC {effectiveEcc}`) and as a state+count
 *    when warn/error (`● 2 ISSUES`);
 *  - the FULL issue list underneath when there's anything to report — every
 *    message renders in full, its own row with its own severity dot, and
 *    wraps instead of truncating. Round 2 truncated to one line with the
 *    full text stashed behind a `title` tooltip; this replaces that with an
 *    always-visible instrument panel (founder: "can't understand what's
 *    wrong without hovering").
 *
 * `version` is the QR symbol version `renderQr` actually encoded at
 * (threaded through lib/preview.ts's `PreviewRenderResult` — see that
 * file's doc comment for why it has to come from there and not from
 * `ScannabilityReport`, which only carries `effectiveEcc`). `null` when
 * unavailable; PreviewStage only mounts this component on the non-error
 * render path, where a version is always known, but the type stays honest
 * about the (currently unreachable) alternative.
 *
 * `role="status" aria-live="polite"` wraps both rows as a single live
 * region — an issue appearing or clearing is exactly the kind of change a
 * screen reader user needs announced. This is an instrument, not a toast:
 * state changes cross-fade via color only (no transform, nothing to
 * disable under prefers-reduced-motion), same as round 2.
 */
export function ScannabilityChip({
  report,
  version,
  className,
}: {
  report: ScannabilityReport;
  version: number | null;
  className?: string;
}) {
  const state = chipState(report);
  const summary = summaryText(report, version);

  return (
    <div
      role="status"
      aria-live="polite"
      data-state={state}
      className={cn("flex w-full flex-col items-center gap-2", className)}
    >
      <div
        className={cn(
          "flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
          state === "clean" && "border-border/60 bg-muted/50 text-muted-foreground",
          state === "warn" &&
            "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:text-amber-400",
          state === "error" && "border-destructive/25 bg-destructive/10 text-destructive",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            state === "clean" && "bg-emerald-500",
            state === "warn" && "bg-amber-500",
            state === "error" && "bg-destructive",
          )}
        />
        <span className="min-w-0 truncate font-mono text-[11px] tracking-[0.15em] uppercase leading-none">
          {summary}
        </span>
      </div>
      {state !== "clean" && (
        <ul className="flex w-full max-w-[34rem] flex-col gap-1.5">
          {report.issues.map((issue, index) => (
            <li
              key={`${issue.code}-${index}`}
              className={cn(
                "flex items-start gap-2 text-left text-xs leading-snug",
                issue.severity === "error"
                  ? "text-destructive"
                  : "text-amber-700 dark:text-amber-400",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1 size-1.5 shrink-0 rounded-full",
                  issue.severity === "error" ? "bg-destructive" : "bg-amber-500",
                )}
              />
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
