import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import {
  purgePlanScanEvents,
  purgeScanDailyRollups,
  SCAN_DAILY_ROLLUP_RETENTION_DAYS,
} from "../../../../lib/purge";
import { PLAN_LIMITS, type Plan } from "../../../../lib/entitlements";

// Vercel Cron hits this on a schedule (apps/web/vercel.json — daily, 09:00
// UTC) to enforce D8's retention window ("free 30d raw, Pro 365d raw;
// rollups persist beyond it"). This purge lives app-side rather than as a
// second pg_cron job (which already runs the hourly scan_daily rollup)
// because the per-plan day-counts it needs are single-sourced in
// apps/web/lib/entitlements.ts (hard rule, CLAUDE.md) — a SQL cron job would
// have to duplicate those numbers (or read them from a config table that
// doesn't exist) to know how far back to delete. D8 amendment: rollup stays
// in Postgres; retention enforcement stays wherever the retention constants
// live.
//
// P9.6-U1: this route now also runs `purgeScanDailyRollups`, trimming the
// rollup table itself (nothing had before — only raw scan_events was
// bounded). Deliberately a THIRD, separate try/catch rather than folded
// into the per-plan loop below: it isn't plan-scoped (see
// SCAN_DAILY_ROLLUP_RETENTION_DAYS's own comment in lib/purge.ts), so it
// runs once, and its failure must not prevent either plan's scan_events
// purge from completing, exactly as the per-plan loop already isolates
// failures from each other.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PLANS = ["free", "pro"] as const satisfies readonly Plan[];

const DAY_MS = 86_400_000;

type PlanPurgeResult = { plan: Plan; deleted: number } | { plan: Plan; error: string };
type RollupPurgeResult = { deleted: number } | { error: string };

/**
 * Constant-time secret comparison — duplicated from
 * workers/redirect/src/kv-sync-endpoint.ts's `secretsMatch` (digest both
 * inputs first so the comparison is fixed-length with no data-dependent
 * early exit, then XOR every byte). Not imported: the Worker is a separate
 * package/runtime target and its source isn't reachable from apps/web's
 * build.
 */
async function secretsMatch(presented: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(presented)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const av = new Uint8Array(a);
  const bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i]! ^ bv[i]!;
  return diff === 0;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  return token.length > 0 ? token : null;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Same disabled-endpoint stance as the Worker's /__kv-sync 404 — answer
    // like an unknown route rather than advertising an unprovisioned secret
    // boundary.
    return NextResponse.json({ error: "not_configured" }, { status: 404 });
  }

  const presented = bearerToken(request);
  if (!presented || !(await secretsMatch(presented, cronSecret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results: PlanPurgeResult[] = [];

  for (const plan of PLANS) {
    const cutoffIso = new Date(
      Date.now() - PLAN_LIMITS[plan].analyticsRetentionDays * DAY_MS,
    ).toISOString();

    try {
      const deleted = await purgePlanScanEvents(admin, plan, cutoffIso);
      results.push({ plan, deleted });
    } catch (error) {
      // Per-plan failure never 500s the whole run — the other plan's purge
      // still gets a chance to complete.
      results.push({
        plan,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  let scanDailyRollups: RollupPurgeResult;
  try {
    // Date-only cutoff (`YYYY-MM-DD`): scan_daily.day is a `date` column,
    // not a timestamptz — same string-comparison convention
    // lib/analytics.ts's rangeWindowUtc relies on, unlike the per-plan
    // cutoffIso above (scan_events.ts IS timestamptz, needs the full ISO
    // instant).
    const cutoffDate = new Date(Date.now() - SCAN_DAILY_ROLLUP_RETENTION_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const deleted = await purgeScanDailyRollups(admin, cutoffDate);
    scanDailyRollups = { deleted };
  } catch (error) {
    scanDailyRollups = {
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }

  return NextResponse.json({ results, scanDailyRollups });
}
