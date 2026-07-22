import type { ScannabilityReport } from "@qrcdn/qr-engine";
import { cn } from "@/lib/utils";

type ChipState = "clean" | "warn" | "error";

function chipState(report: ScannabilityReport): ChipState {
  if (report.issues.some((issue) => issue.severity === "error")) return "error";
  if (report.issues.length > 0) return "warn";
  return "clean";
}

/** Worst-first: an error message always wins over a warning message when a
 *  style somehow trips both in the same pass. */
function worstMessage(report: ScannabilityReport): string {
  const issue = report.issues.find((i) => i.severity === "error") ?? report.issues[0];
  return issue?.message ?? "Scannable";
}

/**
 * Live scannability status (P4-U3) — recomputed from `scannabilityReport`
 * on every style/payload change (see studio-shell.tsx). Fixed height
 * (`h-7`) regardless of state so the preview frame above it never shifts;
 * state changes cross-fade via color only (a background/border/text-color
 * transition — no transform, nothing to disable under
 * prefers-reduced-motion). Long messages truncate to one line with the
 * full text available via `title`, keeping the "never shouty" precision
 * register instead of wrapping a full sentence in all-caps.
 */
export function ScannabilityChip({
  report,
  className,
}: {
  report: ScannabilityReport;
  className?: string;
}) {
  const state = chipState(report);
  const message = state === "clean" ? "Scannable" : worstMessage(report);

  return (
    <div
      role="status"
      aria-live="polite"
      data-state={state}
      title={state === "clean" ? undefined : message}
      className={cn(
        "flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 transition-colors duration-(--duration-fast) ease-(--motion-ease-out)",
        state === "clean" && "border-border/60 bg-muted/50 text-muted-foreground",
        state === "warn" &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-400/25 dark:text-amber-400",
        state === "error" && "border-destructive/25 bg-destructive/10 text-destructive",
        className,
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
      <span
        className={cn(
          "min-w-0 truncate font-mono text-[11px] leading-none",
          state === "clean" && "uppercase tracking-[0.15em]",
        )}
      >
        {message}
      </span>
    </div>
  );
}
