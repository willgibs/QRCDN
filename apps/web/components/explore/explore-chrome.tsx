"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Floating canvas controls: color-scheme toggle (direction is locked). */
export function ExploreChrome() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-full border bg-popover/95 p-1 shadow-lg backdrop-blur">
      <Button
        size="icon-sm"
        variant="ghost"
        className="rounded-full"
        aria-label="Toggle color scheme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>
    </div>
  );
}
