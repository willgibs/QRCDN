import * as React from "react"

import { cn } from "@/lib/utils"

// Vendored shadcn primitive (radix-nova style, apps/web/components.json) —
// same cn() + token classes as ui/input.tsx (border-input, focus-ring-3,
// aria-invalid, dark:bg-input/30 etc.), swapping the single-line `h-8` for a
// `min-h-24` multi-line box. First consumer: components/studio/bulk-create-
// dialog.tsx (P7.5-U4).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
