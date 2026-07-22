// Never store raw IPs (hard rule). ip_hash = sha256(ip + daily salt), salt =
// env.SCAN_SALT + UTC calendar date. WebCrypto (crypto.subtle) is available
// both in the Workers runtime and in Node 22 (used by CI/vitest) — no
// polyfill needed.

/**
 * The salt input rotates automatically at UTC midnight *by construction*:
 * concatenating a fixed Worker secret with today's UTC calendar date means
 * yesterday's ip_hash values are unreproducible today without any cron job,
 * key-rotation infra, or explicit "rotate now" step — the date string IS the
 * rotation. `now.toISOString()` is always UTC regardless of the runtime's
 * local timezone, so this is deterministic across environments.
 */
export function dailySaltInput(scanSalt: string, now: Date): string {
  const utcDate = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return `${scanSalt}:${utcDate}`;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** sha256(ip + daily salt) as a lowercase hex string. */
export async function hashIp(ip: string, scanSalt: string, now: Date): Promise<string> {
  const input = `${ip}:${dailySaltInput(scanSalt, now)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(digest);
}

/**
 * Postgres `bytea` columns (scan_events.ip_hash) expect the `\x<hex>` text
 * input format over PostgREST — sending a bare hex string would insert the
 * literal ASCII bytes of that string, not the hash's binary bytes. This
 * wraps a hex digest into that format; verified against the generated
 * Supabase types (packages/shared/src/database.types.ts), which type
 * ip_hash as `string | null` on both Row and Insert.
 */
export function toPgBytea(hex: string): string {
  return `\\x${hex}`;
}
