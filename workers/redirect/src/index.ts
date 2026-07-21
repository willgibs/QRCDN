// qrcdn-redirect — the scan hot path. Implemented in P5.
// Contract (from the approved plan):
//   - slug-shaped path → KV lookup (cacheTtl 60) → read-through to Supabase
//     REST on miss with KV backfill → 302 + Cache-Control: no-store (NEVER 301)
//   - paused/expired/password → 302 to https://www.qrcdn.com/u/{slug}
//   - everything else → 301 to https://www.qrcdn.com{path}
//   - ctx.waitUntil() scan ingest; no raw IP stored; bot filter at ingest.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return Response.redirect(`https://www.qrcdn.com${url.pathname}`, 301);
  },
} satisfies ExportedHandler;
