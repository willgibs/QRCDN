"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copy-to-clipboard icon button (P9.5-T1b) — the api-keys-panel idiom
 * (`components/api-keys/api-keys-panel.tsx`'s `RevealOnceCard`):
 * `navigator.clipboard` + a timed copied-check state, same cleanup-on-
 * unmount ref pattern. Difference here is a crossfade between the two
 * icons instead of a hard swap — subtle enough to be worth the four extra
 * lines, and `motion-reduce`-safe (opacity/scale only, both GPU
 * properties, never below `scale-90` per emil-design-eng's "nothing
 * appears from nothing" rule).
 */
const COPY_FLASH_TIMEOUT_MS = 1600;

export function CopyButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPY_FLASH_TIMEOUT_MS);
    } catch {
      // Clipboard access denied/unavailable — no error UI for a
      // nice-to-have (same posture as RevealOnceCard's handleCopy).
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy code"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:bg-muted hover:text-foreground motion-reduce:transition-none",
        className,
      )}
    >
      <span className="relative block size-3.5">
        <Copy
          aria-hidden
          className={cn(
            "absolute inset-0 size-3.5 transition-[opacity,transform] duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none",
            copied ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <Check
          aria-hidden
          className={cn(
            "absolute inset-0 size-3.5 text-primary transition-[opacity,transform] duration-(--duration-fast) ease-(--motion-ease-out) motion-reduce:transition-none",
            copied ? "scale-100 opacity-100" : "scale-90 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
