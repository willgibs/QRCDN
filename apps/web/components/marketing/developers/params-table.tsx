import type { ApiParam } from "@/lib/api-reference";

/**
 * Per-endpoint parameters table (P9.5-T5): name/in/type/required/notes,
 * generated straight from `lib/api-reference.ts`'s typed `ApiParam[]`
 * model (filled from the handlers' own validation, never hand-typed
 * prose). Always renders a real `<table>`, even for a zero-param endpoint
 * (a single "No parameters" row spanning every column): every endpoint's
 * docs keep the same predictable shape to scan, and there is always a
 * table element in the DOM to find.
 */
export function ParamsTable({ params }: { params: ApiParam[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">In</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Required</th>
            <th className="px-4 py-2.5 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {params.length === 0 ? (
            <tr>
              <td className="px-4 py-2.5 text-muted-foreground" colSpan={5}>
                No parameters. This endpoint only requires authentication.
              </td>
            </tr>
          ) : (
            params.map((param) => (
              <tr key={param.name} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-2.5 align-top font-mono text-foreground">{param.name}</td>
                <td className="px-4 py-2.5 align-top font-mono text-muted-foreground">{param.in}</td>
                <td className="px-4 py-2.5 align-top font-mono text-foreground">{param.type}</td>
                <td className="px-4 py-2.5 align-top text-muted-foreground">
                  {param.required ? "Required" : "Optional"}
                </td>
                <td className="px-4 py-2.5 align-top text-muted-foreground">{param.notes}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
