import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCodeBySlugCore, getDynamicCodeStyleCore } from "@/lib/codes-core";
import { type Plan } from "@/lib/entitlements";
import { rangeWindowUtc, resolveRangeDays } from "@/lib/analytics";
import { renderPreview } from "@/lib/preview";
import { isLogoDataUri } from "@/lib/logo";
import { printedShortUrl, shortUrl } from "@/lib/short-url";
import { formatDate } from "@/lib/date-format";
import { CodeAnalyticsPanel } from "@/components/codes/code-analytics-panel";
import { CodeActionsPanel } from "@/components/codes/code-actions-panel";
import { StatusPill, ProtectedTag } from "@/components/codes/codes-table";
import { CopyButton } from "@/components/marketing/copy-button";

// D9: all (app) routes are force-dynamic so the getClaims() guard below runs
// fresh on every request rather than riding a cached response.
export const dynamic = "force-dynamic";

const BACK_LINK_CLASS =
  "w-fit font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground";

/**
 * `/codes/[slug]` — a dynamic code's real home (P9.6-U3 rebuild). Before
 * this unit the page showed analytics only: no QR, no download, no way to
 * retarget/pause/protect a code, and no way back to `/codes`. This version
 * adds the artifact itself (rendered server-side from the code's frozen
 * style snapshot) plus the four actions (retarget/pause/access/export)
 * alongside the analytics this page already had.
 *
 * Auth/lookup guard unchanged from the pre-U3 page (same pattern as
 * studio/page.tsx and codes/page.tsx, copied verbatim): `getClaims()` for
 * the page guard (CLAUDE.md hard rule — reads/page-guards don't need the
 * stronger `getUser()` re-verification the mutating actions inside
 * CodeActionsPanel already apply on their own).
 */
export default async function CodeDetailPage(props: PageProps<"/codes/[slug]">) {
  const { slug } = await props.params;
  const { range: rangeParam } = await props.searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const userId = data.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  const plan = (profile?.plan as Plan | undefined) ?? "free";

  const ctx = { db: supabase, ownerId: userId };

  // P7.5-U2: routed through getCodeBySlugCore rather than a raw qr_codes
  // select (same switch as studio/page.tsx and codes/page.tsx) —
  // codes-core.ts's toSummary() is the one place DynamicCodeSummary's
  // derived expiresAt/passwordProtected mapping is defined. "not_found"
  // covers both "wrong slug" and "someone else's code" — RLS makes the two
  // indistinguishable from here regardless.
  const codeResult = await getCodeBySlugCore(ctx, slug);
  if (!codeResult.ok) {
    notFound();
  }
  const code = codeResult.data;

  const range = resolveRangeDays(
    Array.isArray(rangeParam) ? rangeParam[0] : rangeParam,
    plan,
  );
  const { startIso, endIso } = rangeWindowUtc(range);

  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  // Four independent reads, all keyed off `code.id` (already resolved
  // above) — none depends on another's result, so they run in parallel
  // (same pattern app/(app)/codes/page.tsx already established at P9.6-U2).
  //
  // getDynamicCodeStyleCore is a SECOND core call keyed on `code.id`, not a
  // new query shape: DynamicCodeSummary deliberately excludes `style`
  // (large jsonb, may carry a logo data URI) so it never bloats /codes'
  // list response, and this is the one page that actually needs the frozen
  // snapshot to render the artifact.
  const [styleResult, dailyResult, todayResult, recentResult] = await Promise.all([
    getDynamicCodeStyleCore(ctx, code.id),
    supabase
      .from("scan_daily")
      .select("day, scans, uniques, by_country, by_device, by_referer, by_city")
      .eq("code_id", code.id)
      .gte("day", startIso)
      .lt("day", endIso)
      .order("day"),
    supabase
      .from("scan_events")
      .select("id", { count: "exact", head: true })
      .eq("code_id", code.id)
      .gte("ts", todayStartIso),
    supabase
      .from("scan_events")
      .select("ts, country, region, city, device, referer")
      .eq("code_id", code.id)
      .order("ts", { ascending: false })
      .limit(10),
  ]);

  // Render the QR server-side from the code's frozen style snapshot.
  // renderQr (@qrcdn/qr-engine, via lib/preview.ts's never-throw wrapper) is
  // server-safe — zero DOM dependencies, deterministic SVG string
  // generation (precedent: components/marketing/qr-tile.tsx calls it at
  // module scope inside a Server Component). The payload is the code's OWN
  // persistent short URL (printedShortUrl), never the destination — the
  // same payload the Studio sets as the working preview the moment a code
  // is created or loaded (studio-shell.tsx's handleCodeCreated/onCodeLoad),
  // so an export from this page produces an identical artifact to what the
  // Studio would.
  //
  // Two distinct failure paths, both handled honestly rather than a silent
  // placeholder that implies the code renders fine (lib/preview.ts's
  // renderPreview models exactly this "never throw, report the error"
  // contract): a corrupt/unparseable style snapshot
  // (getDynamicCodeStyleCore returns {ok:false, error:"invalid_style"}), or
  // — realistically unreachable, since printedShortUrl is always short, but
  // handled anyway rather than assumed away — a payload renderPreview
  // itself can't encode.
  let svg: string | null = null;
  let paperHex = "var(--qr-bg)";
  let qrError: string | null = null;

  if (!styleResult.ok) {
    qrError =
      "Couldn't render this code's design: its saved style data didn't parse. The short link keeps redirecting normally, only this preview is affected.";
  } else {
    const style = styleResult.data;
    // Defense in depth (qr-engine.md), same guard studio-shell.tsx applies
    // before every renderPreview call: re-validate the persisted assetId
    // shape immediately before it reaches the engine.
    const logoDataUri =
      style.logo && isLogoDataUri(style.logo.assetId) ? style.logo.assetId : undefined;
    const preview = renderPreview(printedShortUrl(code.slug), style, logoDataUri);
    if (preview.error) {
      qrError = preview.error;
    } else {
      svg = preview.svg;
      // Same paperHex resolution as studio-shell.tsx's own PreviewStage
      // wiring: the real saved color when opaque, the --qr-bg bridge token
      // (sRGB hex, never oklch — CLAUDE.md hard rule) when the style's
      // background is transparent, so a transparent QR still shows against
      // a real mat instead of the page's own (possibly dark) background.
      paperHex = style.background.transparent ? "var(--qr-bg)" : style.background.color;
    }
  }

  const dailyRows = dailyResult.data ?? [];
  const scansToday = todayResult.count ?? 0;
  const recentEvents = recentResult.data ?? [];

  return (
    <div>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 lg:px-8">
          <Link href="/codes" className={BACK_LINK_CLASS}>
            ← Codes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {code.name}
            </h1>
            <span className="font-mono text-sm text-muted-foreground">/{code.slug}</span>
            <StatusPill status={code.status} expiresAt={code.expiresAt} />
            {code.passwordProtected && <ProtectedTag />}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-10 px-4 py-8 md:grid-cols-[320px_1fr] md:gap-8 lg:grid-cols-[360px_1fr] lg:px-8">
        {/* Left: the artifact and its identity. */}
        <div className="flex flex-col gap-6">
          {svg ? (
            <div
              role="img"
              aria-label={`QR code for ${code.name}`}
              className="overflow-hidden rounded-2xl p-6 ring-1 ring-foreground/10 [&_svg]:h-auto [&_svg]:w-full"
              style={{ backgroundColor: paperHex }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-10 text-center">
              <p className="text-sm font-medium text-destructive">Couldn&apos;t render this code&apos;s design</p>
              <p className="max-w-[26ch] text-xs text-muted-foreground">{qrError}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Short link</p>
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate font-mono text-sm text-foreground">
                  {shortUrl(code.slug).replace("https://", "")}
                </span>
                <CopyButton
                  code={shortUrl(code.slug)}
                  label={`Copy short link for ${code.name}`}
                  className="shrink-0"
                />
              </div>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Destination</p>
              {code.destination_url ? (
                <a
                  href={code.destination_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <span className="min-w-0 truncate">{code.destination_url}</span>
                  <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No destination set.</p>
              )}
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Created</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(code.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Right: actions and analysis. */}
        <div className="flex flex-col gap-8">
          <div className="rounded-xl border border-border/60 p-4">
            <CodeActionsPanel code={code} plan={plan} svg={svg} />
          </div>

          <CodeAnalyticsPanel
            plan={plan}
            range={range}
            dailyRows={dailyRows}
            scansToday={scansToday}
            recentEvents={recentEvents}
            lifetimeScans={code.scan_count}
          />
        </div>
      </main>
    </div>
  );
}
