"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRANDS, type Brand } from "@/lib/explore";
import { cn } from "@/lib/utils";

/** Short one-word labels for the pill switcher — the full brandCopy labels
 *  overflow the pill at 375px. */
const shortLabel: Record<Brand, string> = {
  precision: "Precision",
  warmth: "Warmth",
  bold: "Bold",
};

/** Floating exploration controls: brand switcher + color-scheme toggle. */
export function ExploreChrome({ brand }: { brand: Brand }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-popover/95 p-1 shadow-lg backdrop-blur">
      {BRANDS.map((b) => (
        <Button
          key={b}
          asChild
          size="sm"
          variant={b === brand ? "default" : "ghost"}
          className="rounded-full text-xs"
        >
          <Link href={`/explore/${b}`}>{shortLabel[b]}</Link>
        </Button>
      ))}
      <Button
        size="icon-sm"
        variant="ghost"
        className={cn("rounded-full")}
        aria-label="Toggle color scheme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>
    </div>
  );
}
