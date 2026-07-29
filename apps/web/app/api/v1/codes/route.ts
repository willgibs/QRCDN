import { NextResponse } from "next/server";
import { defaultQrStyle } from "@qrcdn/shared";
import { authenticateApiRequest, isApiError } from "../../../../lib/api-auth";
import { createDynamicCodeCore, listDynamicCodesCore } from "../../../../lib/codes-core";
import { toApiCode } from "../_lib/to-api-code";
import { internalError, invalidRequest } from "../_lib/api-errors";

// P7-U3: GET lists the caller's dynamic codes, POST creates one. Auth-first
// on every handler (lib/api-auth.ts's pipeline — bearer parse, key format,
// hash+lookup, revocation, plan gate, quota) before any codes-core call;
// codes-core.ts's own owner_id filters are the tenant boundary underneath
// that (this route never queries qr_codes directly).
export const dynamic = "force-dynamic";

// createDynamicCodeCore error strings that are NOT input-validation
// failures (those come from validateDynamicCodeInput inside the core and
// are surfaced verbatim as 422 invalid_request below) — profile lookup,
// count query, insert, and slug-space exhaustion are all backend failures
// the caller can't fix by changing their request.
const CREATE_INTERNAL_ERRORS = new Set([
  "profile_not_found",
  "code_count_failed",
  "insert_failed",
  "slug_exhausted",
]);

// vanity_slugs_not_available (P7.5-U3) is a plan-gate failure, same tier as
// code_limit below — 403, not a 422 the caller could "fix" by resubmitting.
// slug_taken/slug_reserved/invalid_slug are ordinary input-validation
// failures (a bad/unavailable slug in the request body), so they fall
// through to the same 422 invalidRequest passthrough as
// invalid_destination/invalid_name already do — no special-casing needed
// beyond keeping them OUT of CREATE_INTERNAL_ERRORS above.

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (isApiError(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const result = await listDynamicCodesCore({ db: auth.db, ownerId: auth.ownerId });
  if (!result.ok) {
    return internalError();
  }

  return NextResponse.json({ codes: result.data.map(toApiCode) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (isApiError(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("Malformed JSON body.");
  }

  const parsed = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const result = await createDynamicCodeCore(
    { db: auth.db, ownerId: auth.ownerId },
    {
      name: parsed.name,
      destination: parsed.destination,
      // style omitted -> defaultQrStyle (packages/shared/src/style.ts),
      // same fallback the studio's create flow would produce via its own
      // form defaults.
      style: parsed.style ?? defaultQrStyle,
      // slug omitted (undefined) -> the core's auto-generated path,
      // unchanged (P7.5-U3).
      slug: parsed.slug,
    },
  );

  if (!result.ok) {
    if (result.error === "code_limit") {
      return NextResponse.json(
        { error: "code_limit_reached", message: "You have reached your plan's dynamic code limit." },
        { status: 403 },
      );
    }
    if (result.error === "vanity_slugs_not_available") {
      return NextResponse.json(
        {
          error: "vanity_slugs_not_available",
          message: "Custom vanity slugs require a Pro plan.",
        },
        { status: 403 },
      );
    }
    if (CREATE_INTERNAL_ERRORS.has(result.error)) {
      return internalError();
    }
    // slug_taken / slug_reserved / invalid_slug fall through here, same as
    // every other validateDynamicCodeInput failure string.
    return invalidRequest(result.error);
  }

  // createDynamicCodeCore returns the FULL row (QrCode), including the raw
  // expires_at/password_hash columns (always null right after creation —
  // there's no create-time access-controls input) — mapped down to the
  // summary shape explicitly here (P7.5-U2), mirroring studio-shell.tsx's
  // identical handleCodeCreated fix, rather than widening toApiCode to
  // accept a raw row and re-derive the mapping in a second place.
  return NextResponse.json(
    toApiCode({
      id: result.data.id,
      slug: result.data.slug,
      name: result.data.name,
      destination_url: result.data.destination_url,
      status: result.data.status,
      scan_count: result.data.scan_count,
      created_at: result.data.created_at,
      expiresAt: result.data.expires_at,
      passwordProtected: result.data.password_hash !== null,
    }),
    { status: 201 },
  );
}
