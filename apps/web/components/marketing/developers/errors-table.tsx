import type { ApiEndpointError } from "@/lib/api-reference";

/**
 * Status/code/when errors table (P9.5-T5), shared by every per-endpoint
 * errors table AND the shared pipeline-wide Errors section, since both are
 * the same `ApiEndpointError[]` shape. One component, one set of table
 * styles, instead of the page hand-rolling its own markup a second time.
 */
export function ErrorsTable({ errors }: { errors: ApiEndpointError[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[540px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Code</th>
            <th className="px-4 py-2.5 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((row) => (
            <tr key={`${row.status}-${row.code}`} className="border-b border-border/60 last:border-b-0">
              <td className="px-4 py-2.5 align-top font-mono text-foreground">{row.status}</td>
              <td className="px-4 py-2.5 align-top font-mono text-foreground">{row.code}</td>
              <td className="px-4 py-2.5 align-top text-muted-foreground">{row.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
