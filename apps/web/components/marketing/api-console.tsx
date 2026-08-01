import { CodeBlock } from "@/components/marketing/code-block";
import { API_ENDPOINTS } from "@/lib/api-reference";
import { ApiConsoleTabs, type ApiConsolePane } from "./api-console-tabs";
import { ProductWindow } from "./product-window";

/**
 * The API console (P9.5-T3c, section 07 body) — three tabs (Create ·
 * Retarget · Analytics), each pane's request/response pulled straight from
 * `lib/api-reference.ts` (the same typed data `/developers` renders — never
 * a second, hand-copied sample) and rendered through the shared shiki
 * `CodeBlock` (server component, highlighted at build). This file itself
 * stays a plain server component: it composes already-built `CodeBlock`
 * JSX into `panes[].panel` and hands the finished markup to
 * `ApiConsoleTabs`, the one client island, which only toggles visibility.
 */
const CONSOLE_TABS = [
  { id: "create", label: "Create", endpointId: "create-code" },
  { id: "retarget", label: "Retarget", endpointId: "update-code" },
  { id: "analytics", label: "Analytics", endpointId: "code-analytics" },
] as const;

function findEndpoint(endpointId: string) {
  const endpoint = API_ENDPOINTS.find((e) => e.id === endpointId);
  if (!endpoint) throw new Error(`no API_ENDPOINTS entry for "${endpointId}"`);
  return endpoint;
}

export function ApiConsole() {
  const panes: ApiConsolePane[] = CONSOLE_TABS.map((tab) => {
    const endpoint = findEndpoint(tab.endpointId);
    return {
      id: tab.id,
      label: tab.label,
      panel: (
        <div className="flex flex-col gap-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline gap-2.5 font-mono text-xs text-muted-foreground">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-primary">
              {endpoint.method}
            </span>
            <code className="text-foreground">/api/v1{endpoint.path}</code>
          </div>
          <CodeBlock code={endpoint.request.code} lang={endpoint.request.lang} title="Request" />
          <CodeBlock code={endpoint.response.code} lang={endpoint.response.lang} title="Response" />
        </div>
      ),
    };
  });

  return (
    <ProductWindow url="qrcdn.com/api/v1">
      <ApiConsoleTabs panes={panes} />
    </ProductWindow>
  );
}
