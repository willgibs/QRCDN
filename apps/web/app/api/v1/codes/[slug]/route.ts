import { NextResponse } from "next/server";
import { authenticateApiRequest, isApiError } from "../../../../../lib/api-auth";
import { getCodeBySlugCore, retargetCodeCore, setCodePausedCore } from "../../../../../lib/codes-core";
import { validateCodePatchInput } from "../../../../../lib/validation";
import { toApiCode } from "../../_lib/to-api-code";
import { internalError, invalidRequest, notFound } from "../../_lib/api-errors";

// P7-U3: GET reads one code by slug, PATCH retargets/pauses it. Both are
// owner-scoped indirectly — getCodeBySlugCore (codes-core.ts) filters by
// `owner_id` from the authenticated context, so a slug the caller doesn't
// own 404s identically to a slug that doesn't exist at all (no ownership
// leak via a distinct error).
export const dynamic = "force-dynamic";

// retargetCodeCore/setCodePausedCore both re-run their own field-level
// validation (validateDestination/validatePaused) even though
// validateCodePatchInput already validated the same input above — that's
// intentional defense-in-depth in codes-core.ts, not a route bug. The only
// error the *second* validation pass can realistically produce here is
// "update_failed" (the DB write itself failed, e.g. the code was archived
// between the ownership lookup and the write) — a backend failure, not a
// caller-fixable input problem.
const UPDATE_INTERNAL_ERRORS = new Set(["update_failed"]);

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

  // Sequential, not transactional: codes-core.ts exposes single-field
  // mutations (retargetCodeCore, setCodePausedCore), so a PATCH supplying
  // BOTH fields runs two separate writes. If the destination write below
  // succeeds and the pause write that follows it fails, the destination
  // change has already committed and is NOT rolled back — accepted for
  // P7-U3 (this endpoint is the first caller combining both fields in one
  // request; the studio UI only ever sends one field at a time).
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

  return NextResponse.json({ slug, destination, status });
}
