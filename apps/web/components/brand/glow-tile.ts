/**
 * Class-recipe constants for "lit" selected states (Resend-grammar glow) —
 * not components. Callers compose these into a `className` alongside
 * vendored Radix primitives (ui/toggle-group.tsx, plain buttons); never
 * edit ui/toggle*.tsx directly to add this treatment (design-system.md).
 *
 * `data-[state=on]:*` here resolves last over toggleVariants()'s cva-level
 * `data-[state=on]:bg-muted` because ToggleGroupItem appends the caller
 * `className` last in its `cn()` call — verified for tailwind-merge v3.6.0.
 */
export const glowTileOn =
  "data-[state=on]:border-primary/50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-md data-[state=on]:shadow-primary/10";

export const glowSwatchSelected =
  "ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-md shadow-primary/25";
