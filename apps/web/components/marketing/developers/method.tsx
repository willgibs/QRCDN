/** HTTP method badge — extracted verbatim from the old page-local
 *  component (P9.5-T1b), unchanged. */
export function Method({ children }: { children: string }) {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-primary">
      {children}
    </span>
  );
}
