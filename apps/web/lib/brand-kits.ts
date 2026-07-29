import type { Tables } from "@qrcdn/shared";

// Brand-kit domain types. This module exists because the brand-kit server
// actions live in a `"use server"` file (app/(app)/studio/actions.ts), and such
// a file may export async functions ONLY — its export list becomes a runtime
// server-action registry, so an exported type name the bundler can't resolve at
// runtime 500s every action POST to the owning route. See
// lib/use-server-contract.test.ts for the guard and the incident it encodes.
//
// Mirrors the pattern lib/codes-core.ts already sets: the domain module owns
// the domain's types; the "use server" file is a thin, function-only wrapper.

/** A brand-kit row exactly as stored (style is the editable, non-frozen JSON —
 *  contrast qr_codes.style, which is a frozen snapshot per D5). */
export type BrandKit = Tables<"brand_kits">;
