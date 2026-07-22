import type { KvSlugRecord } from "@qrcdn/shared";

// First-party write-through endpoint: `PUT /__kv-sync/{slug}` lets the web
// app push a retarget/pause straight into this Worker's own KV binding, so
// propagation is instant instead of waiting out the read-through TTL.
// Chosen over the app calling the Cloudflare REST API directly because it
// needs no Cloudflare API token anywhere — just one shared secret that
// exists only as a Worker secret and a server-only app env var.
//
// The path prefix "__kv-sync" is deliberately not slug-shaped (underscores
// are outside the slug charset), so it can never collide with a scan.

/** Parse + validate an incoming sync body into a KvSlugRecord — pure, and
 *  strict: unknown fields are dropped, wrong shapes are rejected (null). */
export function parseSyncBody(body: unknown): KvSlugRecord | null {
  if (typeof body !== "object" || body === null) return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.destination !== "string") return null;
  if (!/^https?:\/\//.test(rec.destination) || rec.destination.length > 2048) return null;
  if (typeof rec.paused !== "boolean") return null;
  const out: KvSlugRecord = { destination: rec.destination, paused: rec.paused };
  if (typeof rec.codeId === "string" && rec.codeId.length > 0 && rec.codeId.length <= 64) {
    out.codeId = rec.codeId;
  }
  return out;
}

/** Constant-time equality over the SHA-256 digests of the two strings —
 *  digesting first fixes the length (no early-exit on length mismatch) and
 *  the XOR loop has no data-dependent branches. Avoids the Workers-only
 *  `crypto.subtle.timingSafeEqual` so the same code runs under Node tests. */
export async function secretsMatch(presented: string, expected: string): Promise<boolean> {
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

export async function handleKvSync(
  request: Request,
  kv: KVNamespace,
  syncSecret: string | undefined,
  slugUpper: string,
): Promise<Response> {
  // Endpoint disabled until the secret is provisioned — answer like any
  // unknown path rather than advertising the surface.
  if (!syncSecret) {
    return new Response("not found", { status: 404 });
  }
  const presented = request.headers.get("x-sync-secret");
  if (!presented || !(await secretsMatch(presented, syncSecret))) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const record = parseSyncBody(body);
  if (!record) {
    return new Response("bad request", { status: 400 });
  }

  // Same 5-minute TTL as the read-through backfill (index.ts) — KV is a
  // rolling cache everywhere; Postgres stays the only permanent truth (D2).
  await kv.put(slugUpper, JSON.stringify(record), { expirationTtl: 300 });
  return new Response(null, { status: 204 });
}
