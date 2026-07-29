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
export function statusMeta(status: string): { label: string; className: string } {
  if (status === "paused") {
    return { label: "Paused", className: "bg-muted text-muted-foreground" };
  }
  if (status === "archived") {
    return { label: "Archived", className: "bg-muted/60 text-muted-foreground/70" };
  }
  return { label: "Active", className: "bg-primary/10 text-primary" };
}

export function StatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
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

/**
 * The `/codes` overview table — server-renderable (no "use client"), unlike
 * codes-list.tsx's card-per-row rail treatment: the studio rail is a fixed
 * narrow column, but this page has real table width, so a proper
 * multi-column `Table` reads better than cards here.
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
              <StatusPill status={code.status} />
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {code.scan_count.toLocaleString()}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(code.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/codes/${code.slug}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View analytics
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
