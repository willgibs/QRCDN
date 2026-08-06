"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Inline light/dark toggle (P9-U1, originally the marketing footer's;
 * harvested from ExploreChrome's next-themes control). P9.9-C0.5 moved it
 * out of `components/marketing/` into the APP shell (AppNav): marketing is
 * dark-only by board directive, so the app is now the only surface where
 * theme is a user preference — and this was the product's single theme
 * control, so removing it from the footer without rehoming it would have
 * silently made the whole product system-theme-only.
 *
 * The icon swap itself is pure CSS (`dark:hidden`/`dark:block`, exactly
 * ExploreChrome's own mechanism) driven by the `.dark` class next-themes
 * already sets before first paint — no hydration risk there. `useMounted`
 * guards only the `aria-label`, which — unlike the CSS-driven icon swap —
 * reads `resolvedTheme` directly during render and would otherwise mismatch
 * between the server's unresolved guess and the client's OS/localStorage-
 * resolved value (the same hydration guardrail QrSvg/StudioSlice use,
 * documented in docs/guides/design-system.md's useMounted section).
 *
 * Reduced-motion: nothing here animates. The icon swap is an instant
 * display toggle, not a transition; the button's press feedback comes from
 * the global `[data-slot="button"]:active` rule in globals.css, which
 * already runs through the shared motion tokens.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      className="rounded-full"
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle color scheme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
