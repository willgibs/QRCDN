import type { KvSlugRecord } from "@qrcdn/shared";

// The scan hot path's decision logic — pure functions taking
// (kvRecord | null, restResult | null) → decision, per the P5-U2 brief.
// No fetch, no Response, no KV/Request objects: fully unit-testable by
// constructing these plain inputs directly.

/** Shape of a qr_codes row as selected over the Supabase REST read-through
 *  (`select=id,destination_url,status,expires_at,password_hash`). `id` is
 *  included specifically so scan ingest (D3) can populate
 *  scan_events.code_id and so the KV backfill can carry codeId forward (see
 *  kv-backfill.ts). `expires_at`/`password_hash` were added additively at
 *  P7.5-U1 so the redirect decision below can enforce expiry and the
 *  password wall on a KV miss, not just on a KV hit. */
export interface RestQrCodeRow {
  id: string;
  destination_url: string | null;
  status: string;
  /** ISO-8601 UTC, or null when the code never expires. */
  expires_at: string | null;
  /** Present (non-null) when the code is password-protected. The hash
   *  itself is never forwarded past this module — decideRedirect only ever
   *  checks `!== null`, and buildKvBackfillRecord below only ever derives
   *  the boolean `passwordProtected`, never carries the hash into KV. */
  password_hash: string | null;
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
  | { kind: "password" }
  | { kind: "unclaimed" };

/**
 * Decision table (verified facts, see final report):
 *
 * | kvRecord                        | restResult          | decision                      |
 * |----------------------------------|----------------------|--------------------------------|
 * | hit, paused=true                 | (not consulted)      | unclaimed                      |
 * | hit, expired (now >= expiresAt)  | (not consulted)      | unclaimed (outranks password)  |
 * | hit, passwordProtected=true      | (not consulted)      | password                       |
 * | hit, none of the above           | (not consulted)      | destination (kvRecord.dest)   |
 * | miss                             | found, non-active    | unclaimed                      |
 * | miss                             | found, expired        | unclaimed (outranks password)  |
 * | miss                             | found, password_hash  | password                       |
 * | miss                             | found, active, plain  | destination (row.dest)        |
 * | miss                             | not-found             | unclaimed                      |
 * | miss                             | unreachable            | unclaimed (degraded, D2)      |
 *
 * "non-active" covers 'paused' and 'archived' (and any future status) —
 * the hard rule is "never stop redirecting," which this satisfies by always
 * returning a live 302, just not to the merchant's destination when the
 * code isn't in good standing.
 *
 * Within each branch, evaluation order is paused/non-active → expired →
 * protected → destination, and it's symmetric across the KV-hit and
 * REST-found branches. Expiry deliberately outranks password protection: an
 * expired-and-protected code reads as gone (unclaimed), so it never invites
 * a guess at a password for a code that isn't coming back regardless.
 */
export function decideRedirect(
  kvRecord: KvSlugRecord | null,
  restResult: RestLookupResult | null,
  now: Date = new Date(),
): RedirectDecision {
  if (kvRecord) {
    if (kvRecord.paused) {
      return { kind: "unclaimed" };
    }
    if (kvRecord.expiresAt && now >= new Date(kvRecord.expiresAt)) {
      return { kind: "unclaimed" };
    }
    if (kvRecord.passwordProtected === true) {
      return { kind: "password" };
    }
    return { kind: "destination", destination: kvRecord.destination };
  }

  // KV miss: restResult should always be present (index.ts always consults
  // REST on a miss) — treat an unexpectedly-absent result the same as
  // "unreachable" defensively rather than throwing.
  if (!restResult || restResult.status !== "found") {
    return { kind: "unclaimed" };
  }

  const { row } = restResult;
  if (row.status !== "active") {
    return { kind: "unclaimed" };
  }
  if (row.expires_at && now >= new Date(row.expires_at)) {
    return { kind: "unclaimed" };
  }
  if (row.password_hash !== null) {
    return { kind: "password" };
  }
  return { kind: "destination", destination: row.destination_url ?? "" };
}

/** The KV record to backfill after a REST read-through finds a row —
 *  written regardless of status (active or not) so the next request for
 *  this slug is a KV hit either way, avoiding a repeat Postgres read just to
 *  learn "still paused." `expiresAt`/`passwordProtected` are conditional
 *  assigns (same additive style as `codeId`, see packages/shared/src/kv.ts)
 *  so a row with no expiry/no password produces a byte-identical record to
 *  before P7.5-U1 — `password_hash` itself is never carried into KV, only
 *  the derived boolean. */
export function buildKvBackfillRecord(row: RestQrCodeRow): KvSlugRecord {
  const record: KvSlugRecord = {
    destination: row.destination_url ?? "",
    paused: row.status !== "active",
    codeId: row.id,
  };
  if (row.expires_at) record.expiresAt = row.expires_at;
  if (row.password_hash !== null) record.passwordProtected = true;
  return record;
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
