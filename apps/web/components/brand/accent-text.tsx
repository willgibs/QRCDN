import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Gradient accent-word span for headlines — the Resend "one glowing word"
 * treatment. Mixes toward `--foreground` rather than a second brand hue
 * (D13 precision lock stays violet-only) so the tail brightens in dark mode
 * and deepens in light mode instead of reading as a second accent color.
 *
 * Built for P9 marketing copy per the Resend-grammar design infusion plan;
 * not applied to any live surface yet.
 */
export function AccentText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("bg-clip-text text-transparent", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--primary), color-mix(in oklch, var(--primary) 62%, var(--foreground) 38%))",
      }}
    >
      {children}
    </span>
  );
}
