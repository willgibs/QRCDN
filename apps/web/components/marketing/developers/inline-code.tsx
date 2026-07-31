/** Inline code snippet — extracted verbatim from the old page-local
 *  component (P9.5-T1b), unchanged. */
export function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}
