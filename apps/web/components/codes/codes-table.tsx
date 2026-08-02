import Link from "next/link";
import type { ReactNode } from "react";
import { ChartLine } from "lucide-react";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import { shortUrl } from "@/lib/short-url";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/marketing/copy-button";
import { cn } from "@/lib/utils";
import { codeState } from "@/lib/access";
import { PauseToggleButton } from "./pause-toggle-button";
import { Sparkline } from "./sparkline";

/**
 * Labeled status → pill styling. Mirrors the "Active" pill in the
 * founder-approved dashboard-window.tsx mockup (`bg-primary/10
 * text-primary`) rather than codes-list.tsx's dot+label treatment — that
 * rail is a narrow ~300px column, this page has real table width for a
 * proper pill. Every state renders as labeled text, never a bare dot
 * (founder rule, restated from codes-list.tsx's own statusMeta). "archived"
 * is unreachable through any action in this unit (qr_codes has no
 * delete/archive path yet) but handled honestly anyway, same stance as
 * codes-list.tsx. Exported (alongside `StatusPill`) so
 * code-analytics-panel.tsx — a "use client" file — can reuse the exact same
 * status→label mapping: this module has no directive and no hooks, so a
 * client file importing its plain exports is the same precedent
 * product-window.tsx/top-bar.tsx already set (leaf components staying
 * directive-free, safely importable from either side of the RSC boundary).
 */
export function statusMeta(
  status: string,
  expiresAt?: string | null,
): { label: string; className: string } {
  // `codeState` folds expiry into the label — a code whose expires_at has
  // passed still has status "active" in the DB but no longer reaches its
  // destination, so labeling it "Active" would be a lie (see lib/access.ts).
  switch (codeState(status, expiresAt)) {
    case "paused":
      return { label: "Paused", className: "bg-muted text-muted-foreground" };
    case "archived":
      return { label: "Archived", className: "bg-muted/60 text-muted-foreground/70" };
    case "expired":
      return { label: "Expired", className: "bg-destructive/10 text-destructive" };
    default:
      return { label: "Active", className: "bg-primary/10 text-primary" };
  }
}

export function StatusPill({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt?: string | null;
}) {
  const meta = statusMeta(status, expiresAt);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

/** Shown beside the status pill when a code sits behind a password, so the
 *  list answers "which of my codes are protected?" without opening each one's
 *  Access dialog. Labeled text, never a bare icon (founder rule). */
export function ProtectedTag() {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      Protected
    </span>
  );
}

function StatusCluster({ code }: { code: DynamicCodeSummary }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusPill status={code.status} expiresAt={code.expiresAt} />
      {code.passwordProtected ? <ProtectedTag /> : null}
    </span>
  );
}

function NameLink({ code, className }: { code: DynamicCodeSummary; className?: string }) {
  return (
    <Link
      href={`/codes/${code.slug}`}
      className={cn(
        "text-foreground underline-offset-4 hover:text-primary hover:underline",
        className,
      )}
    >
      {code.name}
    </Link>
  );
}

/** Short-link text + copy affordance. Displays the lowercase, no-scheme
 *  form (`qrcdn.com/SLUG`) — the printed/QR-encoded uppercase form
 *  (`lib/short-url.ts`'s `printedShortUrl`) is for the artifact, not a
 *  screen; the copy button still copies the full, usable `https://` URL
 *  (`shortUrl`, same construction `codes-core.ts`'s `bulkResultUrl` already
 *  uses for the bulk-create result list). No manual max-width here — the
 *  grid column itself (`CodeRow`'s `minmax(0, ...)` track) is what gives
 *  `truncate` a boundary to clip against at desktop; at mobile the row's
 *  own width does the same job. */
function ShortLink({ code }: { code: DynamicCodeSummary }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
        {shortUrl(code.slug).replace("https://", "")}
      </span>
      <CopyButton
        code={shortUrl(code.slug)}
        label={`Copy short link for ${code.name}`}
        className="size-6 shrink-0"
      />
    </span>
  );
}

function RowActions({ code }: { code: DynamicCodeSummary }) {
  return (
    <div className="flex items-center gap-1 md:justify-end">
      <Button
        asChild
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
      >
        <Link href={`/codes/${code.slug}`} aria-label={`View analytics for ${code.name}`}>
          <ChartLine className="size-3.5" aria-hidden />
        </Link>
      </Button>
      <PauseToggleButton id={code.id} paused={code.status === "paused"} />
    </div>
  );
}

/** Small muted field label, visible only below `md` — at desktop the
 *  column header (`HeaderRow`) already gives each grid column its label. */
function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block text-xs text-muted-foreground md:hidden">{children}</span>;
}

/**
 * The grid-template-columns shared by the header row and every code row —
 * one constant so the two can never drift apart. Name/Short link flex
 * (`minmax(0, Nfr)`, so `truncate` inside them has a real boundary at any
 * viewport width); Status hugs its content (pill width varies:
 * "Active"/"Active Protected"/"Expired"...); Activity/Scans/Actions are
 * fixed, sized to their known content (a sparkline, a right-aligned number,
 * two small controls).
 */
const GRID_COLUMNS =
  "md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)_auto_140px_84px_112px]";

function HeaderRow() {
  return (
    <div
      role="row"
      className={cn(
        "hidden border-b border-border/60 px-4 py-2 md:grid md:items-center md:gap-4",
        GRID_COLUMNS,
      )}
    >
      <span role="columnheader" className="text-xs font-medium text-foreground">
        Name
      </span>
      <span role="columnheader" className="text-xs font-medium text-foreground">
        Short link
      </span>
      <span role="columnheader" className="text-xs font-medium text-foreground">
        Status
      </span>
      <span role="columnheader" className="text-xs font-medium text-foreground">
        Activity
      </span>
      <span role="columnheader" className="text-right text-xs font-medium text-foreground">
        Scans
      </span>
      <span role="columnheader" className="sr-only">
        Actions
      </span>
    </div>
  );
}

/**
 * One code, one row — the single source of truth for both the desktop
 * "table" look and the mobile "card" look (P9.6-U2 follow-up; this
 * replaced an earlier version that rendered every row TWICE, once per
 * layout, real `<table>`/`<tr>` markup for one and a parallel `<div>` card
 * list for the other). Measured cost of that: 60 seeded codes produced a
 * ~980KB response — 422 `<svg>`/120 `<polyline>` (60 sparklines × 2
 * variants) — and, independently, React's own streaming SSR taxed every
 * row a SECOND time: a `<tr>` can't be safely streamed as a standalone
 * out-of-order chunk (a bare `<tr>` outside a `<table>` gets
 * foster-parented by the browser's HTML parser), so React wrapped each of
 * the 60 real `<table>` rows in its own temporary `<table
 * hidden><tbody id="S:N">…</tbody></table>` replacement segment — ~339KB
 * (34% of the response) in wrapper overhead alone, verified by inspecting
 * the raw response text, gone once nothing here is a real `<table>`.
 *
 * One `role="row"`/`role="cell"` markup, styled two ways via `md:` —
 * mobile-first: a bordered card, fields stacked top-to-bottom in the exact
 * column order (Name, Short link, Status, Activity, Scans, Actions), each
 * with its own small `FieldLabel` since there's no column header at this
 * width. At `md` and up: `display` switches to `grid`
 * (`GRID_COLUMNS`), the card chrome turns off, and `FieldLabel` hides
 * (the header row already named the column). Real ARIA roles
 * (`table`/`row`/`cell`/`columnheader`) are set explicitly rather than
 * relied on implicitly from `<table>`/`<tr>`/`<td>` tag semantics — the
 * accessibility tree gets the same table structure either way, but
 * `display: grid`/`flex` on a plain `<div>` has no risk of a browser
 * stripping an implicit role the way `display` changes historically could
 * for native table elements.
 */
function CodeRow({
  code,
  sparklines,
}: {
  code: DynamicCodeSummary;
  sparklines: Map<string, number[]>;
}) {
  return (
    <div
      role="row"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/60 p-4",
        "md:grid md:items-center md:gap-4 md:rounded-none md:border-0 md:p-0 md:px-4 md:py-3",
        GRID_COLUMNS,
      )}
    >
      <div role="cell" className="min-w-0">
        <FieldLabel>Name</FieldLabel>
        <NameLink code={code} className="block truncate font-medium" />
      </div>
      <div role="cell" className="min-w-0">
        <FieldLabel>Short link</FieldLabel>
        <ShortLink code={code} />
      </div>
      <div role="cell">
        <FieldLabel>Status</FieldLabel>
        <StatusCluster code={code} />
      </div>
      <div role="cell">
        <FieldLabel>Activity</FieldLabel>
        <Sparkline
          values={sparklines.get(code.id) ?? []}
          className="h-8 w-full md:h-7 md:w-32"
        />
      </div>
      <div role="cell" className="md:text-right">
        <FieldLabel>Scans</FieldLabel>
        <span className="block font-mono text-sm tabular-nums text-foreground">
          {code.scan_count.toLocaleString()}
        </span>
      </div>
      <div role="cell">
        <span className="sr-only">Actions</span>
        <RowActions code={code} />
      </div>
    </div>
  );
}

/**
 * The `/codes` table (P9.6-U2 redesign, single-DOM follow-up) —
 * server-renderable, no "use client" anywhere in this file. Columns: Name ·
 * Short link · Status · Activity (sparkline) · Scans · actions. Row
 * click-through to `/codes/[slug]` lives on the Name cell's own link
 * (`NameLink`) rather than a row-wide overlay — real anchor, zero JS,
 * keyboard-operable, and it sits in its own cell away from the Actions
 * cell's controls, so there's no click-interference to design around. The
 * Actions cell groups an explicit "view analytics" icon-link with
 * `PauseToggleButton` (kept byte-for-byte — see that file's own
 * do-not-retry note) instead of the original page's two bare floating text
 * links.
 *
 * `codes` is the CALLER's already-paginated slice (`app/(app)/codes/page.tsx`,
 * `lib/pagination.ts`), not the full account — this component has no
 * pagination awareness of its own. `sparklines`: `code_id -> daily scan
 * counts`, one array per code, from `scan_sparklines` (P9.6-U1) — already
 * zero-filled server-side over the page's resolved range.
 */
export function CodesTable({
  codes,
  sparklines,
}: {
  codes: DynamicCodeSummary[];
  sparklines: Map<string, number[]>;
}) {
  return (
    <div
      role="table"
      aria-label="Dynamic codes"
      className="flex flex-col gap-3 md:block md:overflow-x-auto md:rounded-xl md:border md:border-border/60"
    >
      <HeaderRow />
      <div role="rowgroup" className="flex flex-col gap-3 md:block md:divide-y md:divide-border/60">
        {codes.map((code) => (
          <CodeRow key={code.id} code={code} sparklines={sparklines} />
        ))}
      </div>
    </div>
  );
}
