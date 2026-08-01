import type { ApiResponseField } from "@/lib/api-reference";

/**
 * Per-endpoint response-fields table (P9.5-T5): field/type/notes, from
 * `lib/api-reference.ts`'s typed `ApiResponseField[]` model. The shared
 * "code object" shape (`CODE_OBJECT_FIELDS` in that module) is compile-time
 * coupled to the real `ApiCode` type, so this table can't silently list a
 * field the API no longer returns, or omit one it does.
 */
export function FieldsTable({ fields }: { fields: ApiResponseField[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Field</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className="border-b border-border/60 last:border-b-0">
              <td className="px-4 py-2.5 align-top font-mono text-foreground">{field.name}</td>
              <td className="px-4 py-2.5 align-top font-mono text-foreground">{field.type}</td>
              <td className="px-4 py-2.5 align-top text-muted-foreground">{field.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
