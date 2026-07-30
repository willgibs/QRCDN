import { NextResponse } from "next/server";
import { authenticateApiRequest, isApiError } from "../../../../../lib/api-auth";
import {
  getCodeBySlugCore,
  retargetCodeCore,
  setCodeAccessCore,
  setCodePausedCore,
} from "../../../../../lib/codes-core";
import { validateCodePatchInput } from "../../../../../lib/validation";
import { toApiCode } from "../../_lib/to-api-code";
import { internalError, invalidRequest, notFound } from "../../_lib/api-errors";

// P7-U3: GET reads one code by slug, PATCH retargets/pauses it. Both are
// owner-scoped indirectly — getCodeBySlugCore (codes-core.ts) filters by
// `owner_id` from the authenticated context, so a slug the caller doesn't
// own 404s identically to a slug that doesn't exist at all (no ownership
// leak via a distinct error).
export const dynamic = "force-dynamic";

// retargetCodeCore/setCodePausedCore/setCodeAccessCore all re-run their own
// field-level validation (validateDestination/validatePaused/
// validateCodeAccessInput) even though validateCodePatchInput already
// validated the same input above — that's intentional defense-in-depth in
// codes-core.ts, not a route bug. The errors the *second* validation pass
// can realistically produce here are backend failures, not caller-fixable
// input problems: "update_failed" (the DB write itself failed, e.g. the
// code was archived between the ownership lookup and the write) and
// setCodeAccessCore's own "profile_not_found" (a data-integrity failure,
// not a bad request — see codes-core.ts). "plan_required" is NOT in this
// set — it's handled as its own 403 branch below, not folded into either
// bucket.
//
// destination_unsafe (P8-U5, lib/safe-browsing.ts via retargetCodeCore) is
// deliberately ALSO not in this set, same reasoning as codes/route.ts's own
// CREATE_INTERNAL_ERRORS comment: a flagged destination is a caller-fixable
// 422, not a backend failure, so it falls through to
// invalidRequest(retargetResult.error) in the destination branch below
// without any special-casing.
const UPDATE_INTERNAL_ERRORS = new Set(["update_failed", "profile_not_found"]);

export async function GET(request: Request, ctx: RouteContext<"/api/v1/codes/[slug]">) {
  const auth = await authenticateApiRequest(request);
  if (isApiError(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { slug } = await ctx.params;
  const result = await getCodeBySlugCore({ db: auth.db, ownerId: auth.ownerId }, slug);
  if (!result.ok) {
    return notFound("Code not found.");
  }

  return NextResponse.json(toApiCode(result.data));
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/codes/[slug]">) {
  const auth = await authenticateApiRequest(request);
  if (isApiError(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { slug } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest("Malformed JSON body.");
  }

  const parsed = (typeof body === "object" && body !== null ? body : {}) as {
    destination?: unknown;
    paused?: unknown;
    expiresAt?: unknown;
  };

  const patchResult = validateCodePatchInput(parsed);
  if (!patchResult.ok) {
    // Covers the empty-patch case ("neither field supplied") along with
    // any per-field validation failure — same 422 envelope either way.
    return invalidRequest(patchResult.error);
  }

  const codesCoreCtx = { db: auth.db, ownerId: auth.ownerId };

  // PATCH addresses by slug; the cores take an id — resolve ownership +
  // the id once, up front, rather than inside each branch below.
  const codeResult = await getCodeBySlugCore(codesCoreCtx, slug);
  if (!codeResult.ok) {
    return notFound("Code not found.");
  }

  let destination = codeResult.data.destination_url ?? "";
  let status = codeResult.data.status;
  let expiresAt = codeResult.data.expiresAt;

  // Sequential, not transactional: codes-core.ts exposes single-field(-ish)
  // mutations (retargetCodeCore, setCodePausedCore, setCodeAccessCore), so a
  // PATCH supplying multiple fields runs multiple separate writes. If an
  // earlier write below succeeds and a later one fails, the earlier change
  // has already committed and is NOT rolled back — accepted for P7-U3 (this
  // endpoint is the first caller combining fields in one request; the
  // studio UI only ever sends one field/action at a time) and unchanged in
  // shape by P7.5-U2's addition of the third branch below.
  if (patchResult.data.destination !== undefined) {
    const retargetResult = await retargetCodeCore(
      codesCoreCtx,
      codeResult.data.id,
      patchResult.data.destination,
    );
    if (!retargetResult.ok) {
      return UPDATE_INTERNAL_ERRORS.has(retargetResult.error)
        ? internalError()
        : invalidRequest(retargetResult.error);
    }
    destination = retargetResult.data.destinationUrl;
  }

  if (patchResult.data.paused !== undefined) {
    const pauseResult = await setCodePausedCore(codesCoreCtx, codeResult.data.id, patchResult.data.paused);
    if (!pauseResult.ok) {
      return UPDATE_INTERNAL_ERRORS.has(pauseResult.error)
        ? internalError()
        : invalidRequest(pauseResult.error);
    }
    status = pauseResult.data.status;
  }

  if (patchResult.data.expiresAt !== undefined) {
    const accessResult = await setCodeAccessCore(codesCoreCtx, codeResult.data.id, {
      expiresAt: patchResult.data.expiresAt,
    });
    if (!accessResult.ok) {
      // plan_required gets its own 403 — it's neither a caller input error
      // (422) nor a backend failure (500), so it doesn't fit either bucket
      // UPDATE_INTERNAL_ERRORS/invalidRequest below already handle.
      if (accessResult.error === "plan_required") {
        return NextResponse.json(
          { error: "plan_required", message: "Access controls are a Pro feature." },
          { status: 403 },
        );
      }
      return UPDATE_INTERNAL_ERRORS.has(accessResult.error)
        ? internalError()
        : invalidRequest(accessResult.error);
    }
    expiresAt = accessResult.data.expiresAt;
  }

  return NextResponse.json({ slug, destination, status, expiresAt });
}
