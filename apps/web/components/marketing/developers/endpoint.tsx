import { CodeBlock } from "@/components/marketing/code-block";
import type { ApiEndpoint } from "@/lib/api-reference";
import { Method } from "./method";

/**
 * One endpoint's docs entry — extracted from the old page-local component
 * (P9.5-T1b), now driven by `lib/api-reference.ts`'s typed data instead of
 * inline props, and through the shared shiki `CodeBlock` (with its
 * `CopyButton`) instead of the old page's plain `<pre><code>`. `id` is the
 * endpoint's stable kebab id (`lib/api-reference.ts`) — the scroll-spy
 * TOC's nested anchor targets.
 */
export function Endpoint({ endpoint }: { endpoint: ApiEndpoint }) {
  const { id, method, path, description, note, request, response } = endpoint;
  return (
    <div id={id} className="scroll-mt-24 border-t border-border/40 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Method>{method}</Method>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
      <div className="mt-3 grid gap-2.5">
        <CodeBlock code={request.code} lang={request.lang} />
        <CodeBlock code={response.code} lang={response.lang} />
      </div>
    </div>
  );
}
