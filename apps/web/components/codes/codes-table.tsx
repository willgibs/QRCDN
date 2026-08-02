import Link from "next/link";
import { ChartLine } from "lucide-react";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import { shortUrl } from "@/lib/short-url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
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

/**
 * Status + protected-tag cluster, shared by both the desktop row and the
 * mobile card below so the two layouts can't drift on this piece.
 */
function StatusCluster({ code }: { code: DynamicCodeSummary }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusPill status={code.status} expiresAt={code.expiresAt} />
      {code.passwordProtected ? <ProtectedTag /> : null}
    </span>
  );
}

/** The primary-label link every row/card uses for click-through to
 *  `/codes/[slug]` — kept as a small shared piece so desktop and mobile
 *  render byte-identical link text/target, never nested inside a `<button>`
 *  or vice versa (both PauseToggleButton and the copy button sit as
 *  siblings, never inside this link, so there is no nested-interactive-
 *  element hazard). */
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

/** Short-link text + copy affordance, shared by both layouts. Displays the
 *  lowercase, no-scheme form (`qrcdn.com/SLUG`) — the printed/QR-encoded
 *  uppercase form (`lib/short-url.ts`'s `printedShortUrl`) is for the
 *  artifact, not a screen; the copy button still copies the full, usable
 *  `https://` URL (`shortUrl`, same construction `codes-core.ts`'s
 *  `bulkResultUrl` already uses for the bulk-create result list). */
function ShortLink({ code, className }: { code: DynamicCodeSummary; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      {/* `min-w-0` here, not just on the flex container above: a flex
       *  ITEM's default min-width is `auto` (its content size), which
       *  overrides `truncate`'s overflow/ellipsis entirely until the item
       *  itself is told it may shrink below that. */}
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

/** Sparkline cell content — falls back to `[]` (renders as the flat/quiet
 *  geometry, not a broken cell) if a code is somehow missing from the
 *  `scan_sparklines` result, which its own zero-fill contract (P9.6-U1)
 *  says should never happen for a real dynamic code. */
function ActivityCell({
  code,
  sparklines,
  className,
}: {
  code: DynamicCodeSummary;
  sparklines: Map<string, number[]>;
  className?: string;
}) {
  return <Sparkline values={sparklines.get(code.id) ?? []} className={className} />;
}

function RowActions({ code }: { code: DynamicCodeSummary }) {
  return (
    <div className="flex items-center justify-end gap-1">
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

/**
 * Below `md`, one card per code — same six pieces of information as the
 * desktop table, same reading order (name, short link, status, activity,
 * scans, actions), no column hidden. The pattern
 * `components/marketing/comparison-section.tsx` already uses for its own
 * mobile/desktop split: two real, independent variants gated by Tailwind
 * responsive display classes (`hidden md:block` / `md:hidden`), not one
 * variant reflowed via CSS — that file's own doc comment records why this
 * is reliable (a `display:none` subtree is excluded from the accessibility
 * tree, so exactly one variant is ever "there" for anything that queries
 * it, screen reader included).
 */
function MobileCodeCard({
  code,
  sparklines,
}: {
  code: DynamicCodeSummary;
  sparklines: Map<string, number[]>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <NameLink code={code} className="min-w-0 truncate font-medium" />
        <PauseToggleButton id={code.id} paused={code.status === "paused"} />
      </div>
      <ShortLink code={code} />
      <StatusCluster code={code} />
      <ActivityCell code={code} sparklines={sparklines} className="h-8 w-full" />
      <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
        <span className="text-xs text-muted-foreground">Scans</span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {code.scan_count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/**
 * The `/codes` overview table (P9.6-U2 redesign) — server-renderable (no
 * "use client"). Columns: Name · Short link · Status · Activity (sparkline)
 * · Scans · actions. Row click-through to `/codes/[slug]` lives on the Name
 * cell's own link (`NameLink`) rather than a row-wide overlay — real anchor,
 * zero JS, keyboard-operable, and it sits away from the Actions cell's
 * controls by construction (different cells), so there's no
 * click-interference to design around. The Actions cell groups an explicit
 * "view analytics" icon-link with `PauseToggleButton` (kept byte-for-byte —
 * see that file's own do-not-retry note) instead of today's two bare
 * floating text links.
 *
 * `sparklines`: `code_id -> daily scan counts`, one array per code, from
 * `scan_sparklines` (P9.6-U1) — already zero-filled server-side over the
 * page's resolved range. Built once in `app/(app)/codes/page.tsx` and
 * threaded straight through; this component does no data fetching.
 */
export function CodesTable({
  codes,
  sparklines,
}: {
  codes: DynamicCodeSummary[];
  sparklines: Map<string, number[]>;
}) {
  return (
    <>
      <Card className="hidden md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Short link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Scans</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">
                    <NameLink code={code} />
                  </TableCell>
                  <TableCell>
                    {/* max-w constrains the flex row so `truncate` inside
                     *  ShortLink has an actual boundary to clip against —
                     *  a <td> otherwise sizes to its widest content (a
                     *  30-char vanity slug, D14's Pro ceiling), which would
                     *  make `truncate` a no-op. */}
                    <ShortLink code={code} className="max-w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <StatusCluster code={code} />
                  </TableCell>
                  <TableCell>
                    <ActivityCell code={code} sparklines={sparklines} className="h-7 w-28" />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {code.scan_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions code={code} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:hidden">
        {codes.map((code) => (
          <MobileCodeCard key={code.id} code={code} sparklines={sparklines} />
        ))}
      </div>
    </>
  );
}
