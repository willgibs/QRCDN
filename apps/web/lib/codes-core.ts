import type { SupabaseClient } from "@supabase/supabase-js";
import type { KvSlugRecord } from "@qrcdn/shared";
import {
  defaultQrStyle,
  parseQrStyle,
  type Database,
  type QrStyle,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "@qrcdn/shared";
import { PLAN_LIMITS, type Plan } from "./entitlements";
import { generateSlug, validateVanitySlug } from "./slug";
import { writeSlugToKv } from "./kv-sync";
import { checkUrlSafety } from "./safe-browsing";
import { hashCodePassword } from "./passwords";
import { SHORT_URL_HOST } from "./short-url";
import {
  validateBrandKitId,
  validateCodeAccessInput,
  validateDestination,
  validateDynamicCodeInput,
  validatePaused,
  type ActionResult,
} from "./validation";
import {
  rangeWindowUtc,
  sumBuckets,
  toChartSeries,
  type BucketCount,
  type ChartPoint,
  type RangeDays,
} from "./analytics";

// ---------------------------------------------------------------------------
// P7-U2: owner-scoped core extracted from
// apps/web/app/(app)/studio/code-actions.ts. This module exists so the exact
// same business logic can be invoked from TWO auth paths:
//   1. Studio server actions (code-actions.ts) — cookie session, RLS-scoped
//      client from lib/supabase/server.ts. Every filter below is redundant
//      defense-in-depth there (RLS already scopes rows to the caller).
//   2. The public API (P7, key-authenticated, no cookies) — admin client
//      from lib/supabase/admin.ts, which BYPASSES RLS entirely.
//
// THE LOAD-BEARING RULE: every single query in this file carries an explicit
// owner filter.
//   - Every `qr_codes` select/update carries `.eq("owner_id", ctx.ownerId)`.
//   - Every `qr_codes` insert sets `owner_id: ctx.ownerId` in the payload.
//   - scan_daily / scan_events have no owner_id column at all — they are
//     only ever queried with a `code_id` that was FIRST produced by an
//     owner-scoped `qr_codes` lookup in THIS file (getCodeBySlugCore, or a
//     `qr_codes` update's own `.eq("owner_id", ...)` — see
//     getCodeAnalyticsCore, which resolves ownership before it ever touches
//     a scan table: this is the IDOR guard).
// Under the API's admin client, the `.eq("owner_id", ...)` filter is the
// ONLY tenant boundary in the system — RLS is not there to catch a mistake.
// A missed filter here is a cross-tenant data leak reachable from the public
// internet. Every query chain below was re-checked against this rule before
// commit; check it again before changing any query in this file.
// ---------------------------------------------------------------------------

export interface CodesCoreCtx {
  db: SupabaseClient<Database>;
  ownerId: string;
}

export type QrCode = Tables<"qr_codes">;

/** Columns the codes-list UI needs — never the `style` jsonb itself (large,
 *  including a possible logo data URI) and never a write path for
 *  `scan_count` (D8: rollup-only). `brandKitId` (P9.8-B1) says which kit a
 *  code mirrors under hard sync, `null` for kit-less frozen codes.
 *  `expiresAt`/`passwordProtected` (P7.5-U2) are DERIVED from
 *  `expires_at`/`password_hash`, not the raw columns themselves — see
 *  `toSummary` below for THE INVARIANT this exists to enforce: the raw
 *  `password_hash` string never crosses this boundary. */
export type DynamicCodeSummary = Pick<
  Tables<"qr_codes">,
  "id" | "slug" | "name" | "destination_url" | "status" | "scan_count" | "created_at"
> & {
  /** The kit this code mirrors (hard sync, D5 as amended), or `null` for a
   *  kit-less frozen code (explicit-style API creation / pre-P9.8 row). */
  brandKitId: string | null;
  /** ISO-8601 UTC, or `null` when the code never expires. */
  expiresAt: string | null;
  /** Derived from `password_hash !== null` — never the hash itself. */
  passwordProtected: boolean;
};

/** Every column a summary-shaped query needs to select — one constant so
 *  every call site (listDynamicCodesCore, getCodeBySlugCore) stays in sync
 *  with `toSummary`'s destructuring below. */
const SUMMARY_SELECT =
  "id, slug, name, destination_url, status, scan_count, created_at, brand_kit_id, expires_at, password_hash" as const;

type SummaryRow = Pick<
  Tables<"qr_codes">,
  | "id"
  | "slug"
  | "name"
  | "destination_url"
  | "status"
  | "scan_count"
  | "created_at"
  | "brand_kit_id"
  | "expires_at"
  | "password_hash"
>;

/**
 * THE INVARIANT (P7.5-U2): the raw `password_hash` string never crosses the
 * codes-core boundary — not into a Server Component prop, not into API
 * JSON, not anywhere past this function. Every query in this file that
 * returns a `DynamicCodeSummary` funnels its row through `toSummary`, which
 * destructures `password_hash` away and keeps only the derived
 * `passwordProtected` boolean. If you add a new summary-shaped query below,
 * route it through this function rather than hand-mapping the row.
 */
function toSummary(row: SummaryRow): DynamicCodeSummary {
  const { password_hash, expires_at, brand_kit_id, ...rest } = row;
  return {
    ...rest,
    brandKitId: brand_kit_id,
    expiresAt: expires_at,
    passwordProtected: password_hash !== null,
  };
}

/**
 * The KV write-through record for a row that just changed (retarget, pause,
 * or access-control update) — the STRUCTURAL FIX for the retarget/pause
 * KV-wipe bug: before P7.5-U2, `retargetCodeCore`/`setCodePausedCore` each
 * built their `KvSlugRecord` literal inline with only `destination`/
 * `paused`/`codeId` set, which meant retargeting or pausing a code SILENTLY
 * DROPPED its `expiresAt`/`passwordProtected` flags from KV (the write-
 * through overwrites the whole record) even though Postgres still had them.
 * Every `writeSlugToKv` call site in this file must build its record via
 * this function instead of a literal, so the three flags can never drift
 * apart again. Conditional-assigns mirror packages/shared/src/kv.ts's own
 * additive-optional style (and workers/redirect/src/redirect-decision.ts's
 * `buildKvBackfillRecord`, the Worker-side equivalent): a row with no
 * expiry/no password produces a record with those keys OMITTED, not set to
 * `false`/`undefined`, so pre-P7.5 KV entries and post-P7.5 unprotected
 * codes are byte-identical.
 */
function toKvRecord(
  row: Pick<QrCode, "destination_url" | "status" | "expires_at" | "password_hash">,
  codeId: string,
): KvSlugRecord {
  const record: KvSlugRecord = {
    destination: row.destination_url ?? "",
    paused: row.status === "paused",
    codeId,
  };
  if (row.expires_at) {
    record.expiresAt = row.expires_at;
  }
  if (row.password_hash !== null) {
    record.passwordProtected = true;
  }
  return record;
}

type RecentEvent = Pick<
  Tables<"scan_events">,
  "ts" | "country" | "region" | "city" | "device" | "referer"
>;

export interface CodeAnalytics {
  code: DynamicCodeSummary;
  series: ChartPoint[];
  totals: { scans: number };
  today: { scans: number };
  topCountries: BucketCount[];
  topDevices: BucketCount[];
  /** Last 10 raw scan_events for this code, newest first — the live-activity
   *  feed codes/[slug]/page.tsx renders alongside the scan_daily-derived
   *  chart (scan_daily lags up to an hour behind, D8, so this is the only
   *  source for "what just happened"). */
  recentEvents: RecentEvent[];
}

const MAX_SLUG_ATTEMPTS = 5;
const RECENT_EVENTS_LIMIT = 10;

/**
 * Counts the caller's non-archived dynamic codes against their plan limit.
 * "archived" is the closest thing this schema has to a soft-delete state for
 * qr_codes (CLAUDE.md: codes are never actually deleted) — no action in this
 * unit can produce one, but excluding it here is the correct reading of "count
 * existing non-deleted codes" against a schema with no deleted_at column.
 * Paused codes still count (D14: they keep existing, just go read-only
 * beyond the free cap).
 */
async function dynamicCodeCountFor(ctx: CodesCoreCtx): Promise<number | null> {
  const { count, error } = await ctx.db
    .from("qr_codes")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ctx.ownerId)
    .eq("kind", "dynamic")
    .neq("status", "archived");
  if (error) {
    return null;
  }
  return count ?? 0;
}

/**
 * Owner-scoped kit lookup for kit-attached creation (P9.8-B1). The style is
 * parsed here, server-side — the client never supplies a style for an
 * attached code, which kills the dirty-studio hazard (a working style with
 * unsaved edits minting a code that instantly diverges from its kit) by
 * construction. A kit whose stored style no longer parses is a hard
 * `invalid_style` error on the explicit path: the caller chose that kit,
 * so silently substituting a default would mint something they didn't ask
 * for.
 */
async function kitStyleFor(
  ctx: CodesCoreCtx,
  kitId: string,
): Promise<ActionResult<{ id: string; style: QrStyle }>> {
  const { data, error } = await ctx.db
    .from("brand_kits")
    .select("id, style")
    .eq("id", kitId)
    .eq("owner_id", ctx.ownerId)
    .single();
  if (error || !data) {
    return { ok: false, error: "brand_kit_not_found" };
  }
  try {
    return { ok: true, data: { id: data.id, style: parseQrStyle(data.style) } };
  } catch {
    return { ok: false, error: "invalid_style" };
  }
}

/**
 * The caller's default kit, for the convenience path (API POST with no
 * explicit style, P9.8-B1): brand-correct by default instead of the generic
 * engine style. `null` when the owner has no default kit OR its stored
 * style fails to parse — on this implicit path a graceful fall-through to
 * `defaultQrStyle` beats failing a request that never named a kit. At most
 * one row exists (`brand_kits_one_default` partial unique index).
 */
async function defaultKitFor(
  ctx: CodesCoreCtx,
): Promise<{ id: string; style: QrStyle } | null> {
  const { data } = await ctx.db
    .from("brand_kits")
    .select("id, style")
    .eq("owner_id", ctx.ownerId)
    .eq("is_default", true)
    .maybeSingle();
  if (!data) {
    return null;
  }
  try {
    return { id: data.id, style: parseQrStyle(data.style) };
  } catch {
    return null;
  }
}

/**
 * The insert (+ auto-slug retry loop) at the bottom of `createDynamicCodeCore`
 * — extracted verbatim (P7.5-U3) so a caller-chosen vanity slug and an
 * auto-generated one can share the same insert shape without duplicating it.
 *
 * `args.slug` present (vanity, already validated/normalized by the caller):
 * a SINGLE insert attempt with that exact slug. A `23505` (Postgres
 * unique_violation — slug is the table's only unique column) here is a real
 * collision on a slug the *caller* picked, so it's surfaced as `slug_taken`
 * for them to resolve — never silently retried with a different slug they
 * didn't ask for.
 *
 * `args.slug` absent (auto path): byte-identical to the pre-extraction
 * behavior — `generateSlug()` + up to `MAX_SLUG_ATTEMPTS` retries on a
 * `23505`, `slug_exhausted` if every attempt collides.
 */
async function insertDynamicCode(
  ctx: CodesCoreCtx,
  args: {
    name: string;
    destination: string;
    style: unknown;
    brandKitId: string | null;
    slug?: string;
  },
): Promise<ActionResult<QrCode>> {
  function payloadFor(slug: string): TablesInsert<"qr_codes"> {
    return {
      owner_id: ctx.ownerId,
      slug,
      kind: "dynamic",
      name: args.name,
      destination_url: args.destination,
      // P9.8-B1, D5 as amended: with brand_kit_id set, `style` is a MIRROR
      // of the kit that sync_kit_codes() keeps current on every kit save.
      // With brand_kit_id null (explicit-style API creation), it is the old
      // frozen snapshot, never mutated — the original D5 guarantee survives
      // for exactly the codes that opted into it. No update path in this
      // file accepts a style param either way; propagation is the SQL
      // function only.
      style: args.style as TablesInsert<"qr_codes">["style"],
      brand_kit_id: args.brandKitId,
    };
  }

  if (args.slug !== undefined) {
    const { data, error } = await ctx.db
      .from("qr_codes")
      .insert(payloadFor(args.slug))
      .select()
      .single();

    if (!error && data) {
      return { ok: true, data };
    }
    if (error?.code === "23505") {
      return { ok: false, error: "slug_taken" };
    }
    return { ok: false, error: "insert_failed" };
  }

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { data, error } = await ctx.db
      .from("qr_codes")
      .insert(payloadFor(generateSlug()))
      .select()
      .single();

    if (!error && data) {
      return { ok: true, data };
    }

    // 23505 = Postgres unique_violation. slug is the table's only unique
    // column, so any 23505 here is a slug collision — retry with a fresh
    // draw. Anything else is a real failure; stop immediately.
    if (error?.code !== "23505") {
      return { ok: false, error: "insert_failed" };
    }
  }

  return { ok: false, error: "slug_exhausted" };
}

export async function createDynamicCodeCore(
  ctx: CodesCoreCtx,
  input: {
    name: unknown;
    destination: unknown;
    /** Explicit style — the kit-less frozen path (API only). Mutually
     *  exclusive with `brandKitId`. */
    style?: unknown;
    /** Attach to this kit and mirror its style (P9.8-B1, hard sync). */
    brandKitId?: unknown;
    slug?: unknown;
  },
): Promise<ActionResult<QrCode>> {
  // Exactly one style source, checked before any query: an explicit style
  // AND a kit id together is a caller bug, and silently picking one would
  // hide it.
  if (input.style !== undefined && input.brandKitId !== undefined) {
    return { ok: false, error: "style_with_kit" };
  }

  const validated = validateDynamicCodeInput(input);
  if (!validated.ok) {
    return validated;
  }

  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("plan")
    .eq("id", ctx.ownerId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  // PLAN_LIMITS is the only source of entitlement limits (CLAUDE.md hard
  // rule) — free/pro both come from apps/web/lib/entitlements.ts.
  const plan = profile.plan as Plan;
  const limit = PLAN_LIMITS[plan].dynamicCodes;

  // Vanity slug (P7.5-U3, Pro-gated): resolved right after the plan fetch,
  // before the count/limit check below, so a disallowed or malformed slug
  // never costs a second query. `input.slug` absent (undefined) takes
  // exactly today's auto-generated path — `slug` stays undefined and
  // insertDynamicCode below runs its retry loop unchanged.
  let slug: string | undefined;
  if (input.slug !== undefined) {
    if (!PLAN_LIMITS[plan].vanitySlugs) {
      return { ok: false, error: "vanity_slugs_not_available" };
    }
    const slugResult = validateVanitySlug(input.slug);
    if (!slugResult.ok) {
      return slugResult;
    }
    slug = slugResult.data;
  }

  const existingCount = await dynamicCodeCountFor(ctx);
  if (existingCount === null) {
    return { ok: false, error: "code_count_failed" };
  }
  // Check-then-insert race accepted, not fixed — same call as
  // createBrandKit's kit_limit check.
  if (existingCount >= limit) {
    return { ok: false, error: "code_limit" };
  }

  // P8-U5: Safe Browsing screen (D14 abuse control) — after validation,
  // as the LAST gate before the insert (the DB write), so a request that's
  // going to fail anyway on plan/limit/slug grounds never spends a Safe
  // Browsing API call. See lib/safe-browsing.ts's fail-open contract: ONLY
  // an affirmative `{ checked: true, safe: false }` blocks. Both
  // `checked: false` shapes (unconfigured, or the check itself failing)
  // proceed to the insert exactly like today — getting this backwards
  // would break every mint the moment a key is unset or misconfigured.
  // Style-source resolution (P9.8-B1, D5 as amended) — three paths, resolved
  // BEFORE the Safe Browsing call below (a bad kit id is a cheap DB miss and
  // must not spend an external API call):
  //   kit id     → the kit's style, read server-side, code ATTACHED (mirror)
  //   style      → the explicit style, code kit-less (frozen — API path)
  //   neither    → the caller's default kit if one exists (brand-correct by
  //                default; the code attaches), else the generic
  //                defaultQrStyle, kit-less. This is the API's omitted-style
  //                convenience path.
  let style: QrStyle;
  let brandKitId: string | null = null;
  if (input.brandKitId !== undefined) {
    const kitId = validateBrandKitId(input.brandKitId);
    if (!kitId.ok) {
      return kitId;
    }
    const kit = await kitStyleFor(ctx, kitId.data);
    if (!kit.ok) {
      return kit;
    }
    style = kit.data.style;
    brandKitId = kit.data.id;
  } else if (validated.data.style !== undefined) {
    style = validated.data.style;
  } else {
    const defaultKit = await defaultKitFor(ctx);
    if (defaultKit) {
      style = defaultKit.style;
      brandKitId = defaultKit.id;
    } else {
      style = defaultQrStyle;
    }
  }

  const safety = await checkUrlSafety(validated.data.destination);
  if (safety.checked && !safety.safe) {
    return { ok: false, error: "destination_unsafe" };
  }

  return insertDynamicCode(ctx, {
    name: validated.data.name,
    destination: validated.data.destination,
    style,
    brandKitId,
    slug,
  });
}

/**
 * The lowercase, API-style short URL for a slug (`https://qrcdn.com/{slug}`)
 * — deliberately NOT `lib/short-url.ts`'s `printedShortUrl` (the uppercase,
 * QR-alphanumeric-mode print form `CreateCodeControl` uses for its "this is
 * now the live artifact on stage" moment). A bulk result set is a list of
 * codes to scan/copy/export, the same shape `app/api/v1/_lib/to-api-code.ts`'s
 * `toApiCode` already serves its callers — so this reuses that exact
 * construction (same `SHORT_URL_HOST` constant, same `.toLowerCase()`),
 * producing a byte-identical string to what `toApiCode` would return for the
 * same slug, rather than hand-rolling a new URL shape for bulk results.
 * `lib/short-url.ts` itself is outside this unit's file scope, so this stays
 * a private helper here instead of a new export added there.
 */
function bulkResultUrl(slug: string): string {
  return `https://${SHORT_URL_HOST.toLowerCase()}/${slug}`;
}

/** Best-effort display name for a failed bulk-item outcome. `item.name`
 *  hasn't necessarily passed `validateDynamicCodeInput` yet — that's often
 *  WHY the item failed — so this never throws: a string is trimmed and used
 *  as-is even if it still violates the 1..60 length rule; anything else
 *  (missing, wrong type) falls back to `""` rather than surfacing `undefined`
 *  in a result the caller may render or put in a CSV. */
function bestEffortItemName(name: unknown): string {
  return typeof name === "string" ? name.trim() : "";
}

export const BULK_MAX = 50;

export type BulkItemOutcome =
  | { name: string; ok: true; slug: string; url: string }
  | { name: string; ok: false; error: string };

/**
 * Bulk dynamic-code creation (P7.5-U4, Pro-gated via `PLAN_LIMITS[plan].bulk`).
 * Two distinct failure tiers, deliberately:
 *
 * - BATCH-level gates fail the whole call before a single row is touched:
 *   empty input, over `BULK_MAX`, no profile, the plan doesn't allow bulk, or
 *   the whole batch would push the caller over their `dynamicCodes` cap
 *   (checked ONCE up front via `dynamicCodeCountFor` — never per item, and
 *   never re-checked mid-loop, so a caller never ends up "some codes over the
 *   limit" from a single call — same check-then-insert-race stance
 *   `createDynamicCodeCore`'s own count check takes above).
 * - PER-ITEM outcomes are partial-success: one bad destination, one taken
 *   vanity slug, or one item's own vanity-slug plan violation never aborts
 *   the rest of the batch — every item gets its own `BulkItemOutcome` and the
 *   loop always continues. This mirrors `createDynamicCodeCore`'s own
 *   validate -> (vanity slug) -> insert sequence per item, just without that
 *   function's own plan/limit checks (already done once, above, for the
 *   whole batch) and without ever throwing partway through.
 *
 * The style source is resolved ONCE up front and shared across every insert
 * (P9.8-B1, D5 as amended): `brandKitId` present → that kit's style, read
 * server-side, every minted code ATTACHED to it (hard sync keeps them
 * current on later kit saves); a bad or cross-owner kit id fails the WHOLE
 * batch before any insert — the caller explicitly named a kit, so minting
 * fifty codes in some other look is worse than failing loudly. `brandKitId`
 * absent → the caller's default kit if one exists (attached), else the
 * generic `defaultQrStyle`, kit-less — mirroring `createDynamicCodeCore`'s
 * own implicit path so the two cores stay congruent.
 *
 * No `writeSlugToKv` call anywhere in this function: creation never writes
 * KV (see `insertDynamicCode` above, and D2) — the Worker's own read-through
 * covers the first scan of a brand-new slug.
 */
export async function createDynamicCodesBulkCore(
  ctx: CodesCoreCtx,
  items: { name: unknown; destination: unknown; slug?: unknown }[],
  brandKitId?: unknown,
): Promise<ActionResult<BulkItemOutcome[]>> {
  if (items.length === 0) {
    return { ok: false, error: "empty_batch" };
  }
  if (items.length > BULK_MAX) {
    return { ok: false, error: "batch_too_large" };
  }

  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("plan")
    .eq("id", ctx.ownerId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  const plan = profile.plan as Plan;
  if (!PLAN_LIMITS[plan].bulk) {
    return { ok: false, error: "bulk_not_available" };
  }

  const existingCount = await dynamicCodeCountFor(ctx);
  if (existingCount === null) {
    return { ok: false, error: "code_count_failed" };
  }
  // Single check for the WHOLE batch, before any insert — never per item.
  if (existingCount + items.length > PLAN_LIMITS[plan].dynamicCodes) {
    return { ok: false, error: "code_limit" };
  }

  let batchStyle: QrStyle;
  let batchKitId: string | null = null;
  if (brandKitId !== undefined) {
    const kitId = validateBrandKitId(brandKitId);
    if (!kitId.ok) {
      return kitId;
    }
    const kit = await kitStyleFor(ctx, kitId.data);
    if (!kit.ok) {
      return kit;
    }
    batchStyle = kit.data.style;
    batchKitId = kit.data.id;
  } else {
    const defaultKit = await defaultKitFor(ctx);
    if (defaultKit) {
      batchStyle = defaultKit.style;
      batchKitId = defaultKit.id;
    } else {
      batchStyle = defaultQrStyle;
    }
  }

  const outcomes: BulkItemOutcome[] = [];

  for (const item of items) {
    const validated = validateDynamicCodeInput({
      name: item.name,
      destination: item.destination,
    });
    if (!validated.ok) {
      outcomes.push({ name: bestEffortItemName(item.name), ok: false, error: validated.error });
      continue;
    }

    // Per-item vanity slug (P7.5-U3's same gate, re-checked per line — one
    // row in a pasted batch may carry a custom slug while the next doesn't).
    let slug: string | undefined;
    if (item.slug !== undefined) {
      if (!PLAN_LIMITS[plan].vanitySlugs) {
        outcomes.push({ name: validated.data.name, ok: false, error: "vanity_slugs_not_available" });
        continue;
      }
      const slugResult = validateVanitySlug(item.slug);
      if (!slugResult.ok) {
        outcomes.push({ name: validated.data.name, ok: false, error: slugResult.error });
        continue;
      }
      slug = slugResult.data;
    }

    // P8-U5: Safe Browsing screen, per item — see lib/safe-browsing.ts's
    // fail-open contract and createDynamicCodeCore's identical comment
    // above. Placed as the LAST gate before this item's insert (after
    // validation/slug resolution, which are free) so an item that was
    // doomed anyway (bad destination, taken vanity slug) never spends a
    // Safe Browsing API call it didn't need. Only an affirmative unsafe
    // verdict fails the item; unconfigured/check_failed proceed to insert
    // like every other item — a blocked destination becomes THAT item's
    // own failure outcome and never aborts the rest of the batch, this
    // function's existing partial-success contract, unchanged.
    const safety = await checkUrlSafety(validated.data.destination);
    if (safety.checked && !safety.safe) {
      outcomes.push({ name: validated.data.name, ok: false, error: "destination_unsafe" });
      continue;
    }

    const insertResult = await insertDynamicCode(ctx, {
      name: validated.data.name,
      destination: validated.data.destination,
      style: batchStyle,
      brandKitId: batchKitId,
      slug,
    });
    if (!insertResult.ok) {
      outcomes.push({ name: validated.data.name, ok: false, error: insertResult.error });
      continue;
    }

    outcomes.push({
      name: validated.data.name,
      ok: true,
      slug: insertResult.data.slug,
      url: bulkResultUrl(insertResult.data.slug),
    });
  }

  return { ok: true, data: outcomes };
}

export async function listDynamicCodesCore(
  ctx: CodesCoreCtx,
): Promise<ActionResult<DynamicCodeSummary[]>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select(SUMMARY_SELECT)
    .eq("owner_id", ctx.ownerId)
    .eq("kind", "dynamic")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { ok: false, error: "list_failed" };
  }

  return { ok: true, data: data.map(toSummary) };
}

/**
 * Fetches a single code's frozen style snapshot (P5-U4 "Load in studio").
 * Read-only. `id` is expected to already be a validated uuid string — see
 * code-actions.ts's `getDynamicCodeStyle`, which validates the raw
 * (`unknown`) input via `validateQrCodeId` before delegating here.
 */
export async function getDynamicCodeStyleCore(
  ctx: CodesCoreCtx,
  id: string,
): Promise<ActionResult<QrStyle>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select("style")
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .single();

  if (error || !data) {
    // Covers both "not found" and "not yours" — under RLS the two are
    // indistinguishable from here; under the admin client this same
    // `owner_id` filter now enforces the same thing directly.
    return { ok: false, error: "not_found" };
  }

  try {
    const style = parseQrStyle(data.style);
    return { ok: true, data: style };
  } catch {
    // A corrupted/unparseable snapshot never crashes the "Load in studio"
    // flow — it surfaces as a normal action error instead.
    return { ok: false, error: "invalid_style" };
  }
}

export async function retargetCodeCore(
  ctx: CodesCoreCtx,
  id: string,
  destination: unknown,
): Promise<ActionResult<{ id: string; destinationUrl: string; kvSynced: boolean }>> {
  const destinationResult = validateDestination(destination);
  if (!destinationResult.ok) {
    return destinationResult;
  }

  // P8-U5: Safe Browsing screen (D14 abuse control) — after validation,
  // before the update (the DB write). Same fail-open contract as
  // createDynamicCodeCore above: ONLY `{ checked: true, safe: false }`
  // blocks; both `checked: false` shapes proceed to the update unchanged.
  // Retarget is the one path a malicious actor could use to slip a bad
  // destination onto an ALREADY-PRINTED, already-trusted code after the
  // fact, so this check applies here even though creation already ran it.
  const safety = await checkUrlSafety(destinationResult.data);
  if (safety.checked && !safety.safe) {
    return { ok: false, error: "destination_unsafe" };
  }

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update({ destination_url: destinationResult.data })
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  // Postgres UPDATE already committed above — this is best-effort
  // write-through (D2). A KV failure does NOT fail the action; worst case
  // is ~5min staleness until the Worker's own read-through backfill.
  // toKvRecord (not a hand-built literal) is the P7.5-U2 fix for the
  // retarget-wipes-expiry/password-flags bug — see its own doc comment.
  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: { id, destinationUrl: data.destination_url ?? "", kvSynced: kvResult.synced },
  };
}

export async function setCodePausedCore(
  ctx: CodesCoreCtx,
  id: string,
  paused: unknown,
): Promise<ActionResult<{ id: string; status: string; kvSynced: boolean }>> {
  const pausedResult = validatePaused(paused);
  if (!pausedResult.ok) {
    return pausedResult;
  }

  const nextStatus = pausedResult.data ? "paused" : "active";

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update({ status: nextStatus })
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  // toKvRecord (not a hand-built literal) — same P7.5-U2 fix as
  // retargetCodeCore above, see toKvRecord's doc comment.
  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: { id, status: data.status, kvSynced: kvResult.synced },
  };
}

/**
 * Sets/clears a dynamic code's expiry and/or password protection (P7.5-U2).
 * Plan-gated (PLAN_LIMITS[plan].accessControls, CLAUDE.md hard rule: limits
 * live only in entitlements.ts) — checked BEFORE the update runs, so a
 * free-plan caller's request never reaches the qr_codes table at all.
 *
 * The update payload is built sparse: only the keys the caller actually
 * supplied are set on the Postgres UPDATE, mirroring validateCodeAccessInput
 * distinguishing "omitted" (leave alone) from "explicitly null" (clear).
 * `password` hashing happens HERE and ONLY here — `hashCodePassword` is
 * never called from any other file — so the raw password string's lifetime
 * is confined to this one function body.
 */
export async function setCodeAccessCore(
  ctx: CodesCoreCtx,
  id: string,
  input: { expiresAt?: unknown; password?: unknown },
): Promise<
  ActionResult<{ id: string; expiresAt: string | null; passwordProtected: boolean; kvSynced: boolean }>
> {
  const validated = validateCodeAccessInput(input);
  if (!validated.ok) {
    return validated;
  }

  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("plan")
    .eq("id", ctx.ownerId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }

  const plan = profile.plan as Plan;
  if (!PLAN_LIMITS[plan].accessControls) {
    return { ok: false, error: "plan_required" };
  }

  const patch: TablesUpdate<"qr_codes"> = {};
  if (validated.data.expiresAt !== undefined) {
    patch.expires_at = validated.data.expiresAt;
  }
  if (validated.data.password !== undefined) {
    patch.password_hash =
      validated.data.password === null ? null : await hashCodePassword(validated.data.password);
  }

  const { data, error } = await ctx.db
    .from("qr_codes")
    .update(patch)
    .eq("owner_id", ctx.ownerId)
    .eq("id", id)
    .eq("kind", "dynamic")
    .select("slug, destination_url, status, expires_at, password_hash")
    .single();

  if (error || !data) {
    return { ok: false, error: "update_failed" };
  }

  const kvResult = await writeSlugToKv(data.slug, toKvRecord(data, id));

  return {
    ok: true,
    data: {
      id,
      expiresAt: data.expires_at,
      passwordProtected: data.password_hash !== null,
      kvSynced: kvResult.synced,
    },
  };
}

/**
 * Owner-scoped lookup by slug — the entry point for both the future
 * per-slug API route and `getCodeAnalyticsCore` below. `kind = "dynamic"`
 * mirrors every other lookup in this file (static codes have no analytics
 * surface).
 */
export async function getCodeBySlugCore(
  ctx: CodesCoreCtx,
  slug: string,
): Promise<ActionResult<DynamicCodeSummary>> {
  const { data, error } = await ctx.db
    .from("qr_codes")
    .select(SUMMARY_SELECT)
    .eq("owner_id", ctx.ownerId)
    .eq("slug", slug)
    .eq("kind", "dynamic")
    .single();

  if (error || !data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, data: toSummary(data) };
}

/**
 * Models the three query groups `codes/[slug]/page.tsx` runs today:
 * scan_daily rows over the resolved range, a live "today" count, and the
 * last 10 raw scan_events. Resolves ownership via `getCodeBySlugCore`
 * FIRST — every scan-table query below uses `code.id` from that owner-scoped
 * result, never the raw `slug` argument directly (IDOR guard: a caller who
 * doesn't own `slug` never reaches a scan-table query at all).
 */
export async function getCodeAnalyticsCore(
  ctx: CodesCoreCtx,
  slug: string,
  range: RangeDays,
): Promise<ActionResult<CodeAnalytics>> {
  const codeResult = await getCodeBySlugCore(ctx, slug);
  if (!codeResult.ok) {
    return codeResult;
  }
  const code = codeResult.data;

  const { startIso, endIso } = rangeWindowUtc(range);

  const { data: dailyRows, error: dailyError } = await ctx.db
    .from("scan_daily")
    .select("day, scans, uniques, by_country, by_device")
    .eq("code_id", code.id)
    .gte("day", startIso)
    .lt("day", endIso)
    .order("day");

  if (dailyError) {
    return { ok: false, error: "analytics_failed" };
  }
  const rows = dailyRows ?? [];

  // "today" never comes from scan_daily (it lags up to an hour behind the
  // rollup cron, D8) — a live count against scan_events instead.
  const now = new Date();
  const todayStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const { count: scansToday, error: todayError } = await ctx.db
    .from("scan_events")
    .select("id", { count: "exact", head: true })
    .eq("code_id", code.id)
    .gte("ts", todayStartIso);

  if (todayError) {
    return { ok: false, error: "analytics_failed" };
  }

  const { data: recentEvents, error: recentError } = await ctx.db
    .from("scan_events")
    .select("ts, country, region, city, device, referer")
    .eq("code_id", code.id)
    .order("ts", { ascending: false })
    .limit(RECENT_EVENTS_LIMIT);

  if (recentError) {
    return { ok: false, error: "analytics_failed" };
  }

  return {
    ok: true,
    data: {
      code,
      series: toChartSeries(rows, range),
      totals: { scans: rows.reduce((sum, row) => sum + row.scans, 0) },
      today: { scans: scansToday ?? 0 },
      topCountries: sumBuckets(rows.map((row) => row.by_country)),
      topDevices: sumBuckets(rows.map((row) => row.by_device)),
      recentEvents: recentEvents ?? [],
    },
  };
}
