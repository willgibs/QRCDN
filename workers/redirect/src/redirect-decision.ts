import type { KvSlugRecord } from "@qrcdn/shared";

// The scan hot path's decision logic — pure functions taking
// (kvRecord | null, restResult | null) → decision, per the P5-U2 brief.
// No fetch, no Response, no KV/Request objects: fully unit-testable by
// constructing these plain inputs directly.

/** Shape of a qr_codes row as selected over the Supabase REST read-through
 *  (`select=id,destination_url,status`). `id` is included specifically so
 *  scan ingest (D3) can populate scan_events.code_id and so the KV backfill
 *  can carry codeId forward (see kv-backfill.ts). */
export interface RestQrCodeRow {
  id: string;
  destination_url: string | null;
  status: string;
}

/** Outcome of consulting Supabase REST on a KV miss. Three states, not two —
 *  "not-found" (the slug genuinely doesn't exist) and "unreachable"
 *  (Supabase is down/erroring) both degrade to the same unclaimed redirect,
 *  but they're distinguished here because a future caller might want to
 *  treat them differently (e.g. alerting only on "unreachable"). */
export type RestLookupResult =
  | { status: "found"; row: RestQrCodeRow }
  | { status: "not-found" }
  | { status: "unreachable" };

export type RedirectDecision =
  | { kind: "destination"; destination: string }
  | { kind: "unclaimed" };

/**
 * Decision table (verified facts, see final report):
 *
 * | kvRecord           | restResult         | decision                     |
 * |--------------------|---------------------|-------------------------------|
 * | hit, paused=false  | (not consulted)     | destination (kvRecord.dest)  |
 * | hit, paused=true   | (not consulted)     | unclaimed                     |
 * | miss               | found, active       | destination (row.dest)       |
 * | miss               | found, non-active   | unclaimed                     |
 * | miss               | not-found           | unclaimed                     |
 * | miss               | unreachable         | unclaimed (degraded, D2)      |
 *
 * "non-active" covers 'paused' and 'archived' (and any future status) —
 * the hard rule is "never stop redirecting," which this satisfies by always
 * returning a live 302, just not to the merchant's destination when the
 * code isn't in good standing.
 */
export function decideRedirect(
  kvRecord: KvSlugRecord | null,
  restResult: RestLookupResult | null,
): RedirectDecision {
  if (kvRecord) {
    return kvRecord.paused
      ? { kind: "unclaimed" }
      : { kind: "destination", destination: kvRecord.destination };
  }

  // KV miss: restResult should always be present (index.ts always consults
  // REST on a miss) — treat an unexpectedly-absent result the same as
  // "unreachable" defensively rather than throwing.
  if (!restResult || restResult.status !== "found") {
    return { kind: "unclaimed" };
  }

  if (restResult.row.status !== "active") {
    return { kind: "unclaimed" };
  }
  return { kind: "destination", destination: restResult.row.destination_url ?? "" };
}

/** The KV record to backfill after a REST read-through finds a row —
 *  written regardless of status (active or not) so the next request for
 *  this slug is a KV hit either way, avoiding a repeat Postgres read just to
 *  learn "still paused." */
export function buildKvBackfillRecord(row: RestQrCodeRow): KvSlugRecord {
  return {
    destination: row.destination_url ?? "",
    paused: row.status !== "active",
    codeId: row.id,
  };
}

/**
 * The code_id for scan ingest, independent of the redirect decision above:
 * available whenever we know which real code was hit, whether or not the
 * decision routed to the destination or to /u/{slug} (a scan against a
 * paused code is still a scan). Undefined when the slug is genuinely
 * unclaimed/unknown, Supabase was unreachable, or the KV record predates the
 * additive codeId field (see packages/shared/src/kv.ts) — ingest.ts skips
 * ingest rather than guessing in all three cases.
 */
export function resolveCodeId(
  kvRecord: KvSlugRecord | null,
  restResult: RestLookupResult | null,
): string | undefined {
  if (kvRecord?.codeId) {
    return kvRecord.codeId;
  }
  if (restResult?.status === "found") {
    return restResult.row.id;
  }
  return undefined;
}
