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
    },
  );

  if (!result.ok) {
    if (result.error === "code_limit") {
      return NextResponse.json(
        { error: "code_limit_reached", message: "You have reached your plan's dynamic code limit." },
        { status: 403 },
      );
    }
    if (CREATE_INTERNAL_ERRORS.has(result.error)) {
      return internalError();
    }
    return invalidRequest(result.error);
  }

  return NextResponse.json(toApiCode(result.data), { status: 201 });
}
