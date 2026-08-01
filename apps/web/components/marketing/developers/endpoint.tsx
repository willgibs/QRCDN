import type { ReactNode } from "react";
import { CodeBlock } from "@/components/marketing/code-block";
import type { ApiEndpoint } from "@/lib/api-reference";
import { Method } from "./method";
import { ParamsTable } from "./params-table";
import { FieldsTable } from "./fields-table";
import { ErrorsTable } from "./errors-table";

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 mt-6 font-mono text-eyebrow font-semibold uppercase text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * One endpoint's full docs entry (P9.5-T1b, content-ascended at P9.5-T5),
 * driven entirely by `lib/api-reference.ts`'s typed data. `id` is the
 * endpoint's stable kebab id: the scroll-spy TOC's nested anchor targets,
 * and also what the Quickstart section's "Full reference" links point at.
 * Reading order (params before the sample, response fields and errors
 * after it) mirrors how a developer actually needs the information: what
 * to send, what you get back, then what can go wrong.
 */
export function Endpoint({ endpoint }: { endpoint: ApiEndpoint }) {
  const { id, method, path, description, params, request, response, responseFields, errors } = endpoint;
  return (
    <div id={id} className="scroll-mt-24 border-t border-border/40 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Method>{method}</Method>
        <code className="font-mono text-sm text-foreground">{path}</code>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <SubLabel>Parameters</SubLabel>
      <ParamsTable params={params} />

      <div className="mt-4 grid gap-2.5">
        <CodeBlock code={request.code} lang={request.lang} title="Request" />
        <CodeBlock code={response.code} lang={response.lang} title="Response" />
      </div>

      <SubLabel>Response fields</SubLabel>
      <FieldsTable fields={responseFields} />

      <SubLabel>Errors</SubLabel>
      <ErrorsTable errors={errors} />
    </div>
  );
}
