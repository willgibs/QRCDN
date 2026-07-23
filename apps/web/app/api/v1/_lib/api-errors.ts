import { NextResponse } from "next/server";

// Small shared response builders for the /api/v1 route handlers — keeps the
// `{ error, message }` envelope shape (matching lib/api-auth.ts's ApiError)
// consistent across every non-auth failure path these routes produce.

export function invalidRequest(message: string) {
  return NextResponse.json({ error: "invalid_request", message }, { status: 422 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: "not_found", message }, { status: 404 });
}

export function internalError() {
  return NextResponse.json(
    { error: "internal_error", message: "Something went wrong. Try again." },
    { status: 500 },
  );
}
