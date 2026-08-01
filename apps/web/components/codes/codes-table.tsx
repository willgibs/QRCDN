import Link from "next/link";
import type { DynamicCodeSummary } from "@/lib/codes-core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { codeState } from "@/lib/access";
import { PauseToggleButton } from "./pause-toggle-button";

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
 * The `/codes` overview table — server-renderable (no "use client"), unlike
 * codes-list.tsx's card-per-row rail treatment: the studio rail is a fixed
 * narrow column, but this page has real table width, so a proper
 * multi-column `Table` reads better than cards here.
 *
 * P9.5-T7: each row's Pause/Resume is `PauseToggleButton`
 * (components/codes/pause-toggle-button.tsx) — a small `"use client"` leaf,
 * same "island inside a server-rendered tree" shape `copy-button.tsx`
 * already establishes inside `CodeBlock`. This table itself stays a Server
 * Component with no directive of its own. See that file's own doc comment
 * for the two other mechanisms tried first (a plain form with
 * revalidatePath/refresh/redirect, and a useActionState-driven form) and
 * why both were abandoned — both looked correct and both failed to
 * reliably get a change onto the screen without a hard reload in between,
 * confirmed by direct network-request inspection, not assumed. The button
 * sits in the same "Actions" cell as the existing "View analytics" link,
 * as a sibling element, never nested inside the `<Link>` — this table has
 * no row-wide anchor to nest inside of in the first place (only that one
 * inline text link), so there is no nested-interactive-element hazard to
 * design around here.
 */
export function CodesTable({ codes }: { codes: DynamicCodeSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Scans</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="sr-only">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code) => (
          <TableRow key={code.id}>
            <TableCell className="font-medium text-foreground">{code.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">/{code.slug}</TableCell>
            <TableCell>
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={code.status} expiresAt={code.expiresAt} />
                {code.passwordProtected ? <ProtectedTag /> : null}
              </span>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {code.scan_count.toLocaleString()}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(code.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-3">
                <PauseToggleButton id={code.id} paused={code.status === "paused"} />
                <Link
                  href={`/codes/${code.slug}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  View analytics
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
