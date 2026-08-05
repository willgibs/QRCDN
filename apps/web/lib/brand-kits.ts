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

/** A brand-kit row exactly as stored. `style` is the SOURCE OF TRUTH for
 *  every attached code under hard sync (P9.8-B1, D5 as amended): kit edits
 *  propagate to attached qr_codes rows via sync_kit_codes(); only kit-less
 *  codes (brand_kit_id null) still hold frozen snapshots. */
export type BrandKit = Tables<"brand_kits">;

/** The columns a kit-picker needs (P9.8-B2: /codes' create/bulk-create
 *  dialogs) — narrower than the full `BrandKit` row (no logo bytes, no
 *  timestamps), same "one canonical narrow read shape" precedent
 *  `lib/codes-core.ts`'s `DynamicCodeSummary` already sets for codes. */
export type KitPickerKit = Pick<BrandKit, "id" | "name" | "style" | "is_default">;
