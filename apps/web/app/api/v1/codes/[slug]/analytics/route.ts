import { NextResponse } from "next/server";
import { authenticateApiRequest, isApiError } from "../../../../../../lib/api-auth";
import { getCodeAnalyticsCore } from "../../../../../../lib/codes-core";
import { resolveRangeDays } from "../../../../../../lib/analytics";
import { toApiCode } from "../../../_lib/to-api-code";
import { internalError, notFound } from "../../../_lib/api-errors";

// P7-U3: per-code analytics, mirroring the shape codes/[slug]/page.tsx
// renders in the studio dashboard (scan_daily-derived series/totals/
// top-N breakdowns + a live "today" count + the last 10 raw scan_events).
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/api/v1/codes/[slug]/analytics">) {
  const auth = await authenticateApiRequest(request);
  if (isApiError(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { slug } = await ctx.params;
  const url = new URL(request.url);
  // Free plan never reaches here (api-auth's plan gate 403s first, since
  // PLAN_LIMITS.free.apiMonthlyRequests is null) — `auth.plan` is always
  // "pro" in this handler today, but resolveRangeDays stays plan-driven
  // rather than hardcoding "pro" so a future paid tier's ceiling is honored
  // automatically.
  const range = resolveRangeDays(url.searchParams.get("range") ?? undefined, auth.plan);

  const result = await getCodeAnalyticsCore({ db: auth.db, ownerId: auth.ownerId }, slug, range);
  if (!result.ok) {
    // getCodeAnalyticsCore's only caller-facing error is "not_found"
    // (unowned/nonexistent slug); anything else ("analytics_failed") is a
    // scan_daily/scan_events query failure — a backend problem, not a
    // missing-resource one.
    return result.error === "not_found" ? notFound("Code not found.") : internalError();
  }

  const { code, series, totals, today, topCountries, topDevices, recentEvents } = result.data;

  return NextResponse.json({
    range,
    code: toApiCode(code),
    series,
    totals,
    today,
    topCountries,
    topDevices,
    recentEvents,
  });
}
