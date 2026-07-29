// API key format: generate/validate/hash (P7-U1). Design rationale:
// docs/DECISIONS.md D11 — "qrcdn_live_ + 32 base62 + CRC tail; store prefix
// (display) + sha256 hash (unique-index O(1) lookup — slow hashes
// unnecessary at >=128-bit entropy)."
//
// Pure, no I/O beyond the platform crypto global (available both in Node 22,
// used by vitest, and in the Vercel Node runtime — no polyfill needed, same
// posture as workers/redirect/src/scan-hash.ts for the Workers runtime).

/** `qrcdn_live_` — 11 chars. */
export const KEY_PREFIX = "qrcdn_live_";
/** Random body length, in base62 characters. */
export const RANDOM_LENGTH = 32;
/** Fixed-width, zero-padded base62 CRC-32 tail. */
export const CRC_LENGTH = 6;
/** KEY_PREFIX.length + RANDOM_LENGTH + CRC_LENGTH. */
export const TOTAL = KEY_PREFIX.length + RANDOM_LENGTH + CRC_LENGTH;

/** Digits, then uppercase, then lowercase — standard base62 ordering. */
export const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// ============================================================ crc32
// Standard IEEE 802.3 CRC-32 (the zlib/gzip/PNG polynomial), pure TS,
// table-based. Not a security primitive — it's a typo/transcription-error
// gate (formatValidateApiKey), not the secrecy boundary (that's the sha256
// hash + >=128 bits of random entropy). No crc32 dependency exists in the
// repo and none may be added (agent-playbook: don't add deps silently; this
// task's spec says none may be added at all), so this is hand-rolled.
let crc32TableCache: Uint32Array | null = null;

function crc32Table(): Uint32Array {
  if (crc32TableCache) return crc32TableCache;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crc32TableCache = table;
  return table;
}

/** Standard IEEE 802.3 CRC-32 of a UTF-8 string, as an unsigned 32-bit int. */
export function crc32(input: string): number {
  const table = crc32Table();
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ============================================================ base62 encode
/**
 * Encodes `n` as a fixed-`width` base62 string, left-padded with `BASE62[0]`
 * ("0"). Used for the CRC tail so every key is exactly TOTAL chars long
 * regardless of how small the CRC happens to be — a variable-width tail
 * would make `formatValidateApiKey`'s length check ambiguous.
 */
export function encodeBase62FixedWidth(n: number, width: number): string {
  let value = n;
  let digits = "";
  do {
    digits = BASE62[value % 62] + digits;
    value = Math.floor(value / 62);
  } while (value > 0);

  if (digits.length > width) {
    throw new Error(`encodeBase62FixedWidth: ${n} needs more than ${width} base62 digits`);
  }
  return digits.padStart(width, BASE62[0]);
}

// ============================================================ random generation
// Rejection sampling avoids modulo bias: 256 is not a multiple of 62, so
// `byte % 62` alone would make chars 0-7 (256 % 62 = 8 leftover values)
// slightly more likely than chars 8-61. Discarding any byte >= 248
// (256 - 256 % 62) leaves only a range that IS an exact multiple of 62,
// making every base62 character equally likely.
const REJECTION_THRESHOLD = 256 - (256 % BASE62.length); // 248

function randomBase62String(length: number): string {
  let result = "";
  // Draw in batches rather than one getRandomValues() call per character —
  // the rejection rate is low (~3%) but batching keeps this from being
  // length getRandomValues syscalls in the worst case.
  const batch = new Uint8Array(Math.max(length * 2, 32));
  while (result.length < length) {
    crypto.getRandomValues(batch);
    for (const byte of batch) {
      if (result.length >= length) break;
      if (byte < REJECTION_THRESHOLD) {
        result += BASE62[byte % BASE62.length];
      }
    }
  }
  return result;
}

// ============================================================ generate / validate / hash

export interface GeneratedApiKey {
  /** The full secret — shown to the user exactly once at creation time. */
  fullKey: string;
  /** `qrcdn_live_XXXX` (15 chars) — safe to store/display alongside the hash
   *  so users can tell keys apart without ever seeing the secret again. */
  displayPrefix: string;
}

/** Mints a new API key: KEY_PREFIX + RANDOM_LENGTH random base62 chars +
 *  a CRC-32 tail of the prefix+random body, base62-encoded to CRC_LENGTH. */
export function generateApiKey(): GeneratedApiKey {
  const random = randomBase62String(RANDOM_LENGTH);
  const body = KEY_PREFIX + random;
  const crcTail = encodeBase62FixedWidth(crc32(body), CRC_LENGTH);
  const fullKey = body + crcTail;
  return { fullKey, displayPrefix: fullKey.slice(0, KEY_PREFIX.length + 4) };
}

/**
 * Zero-DB-hit format/typo gate: length, prefix, charset, and CRC all have to
 * check out before this is even worth hashing and looking up. Does NOT prove
 * the key is live/unrevoked — that's a DB lookup by hash, a separate concern.
 */
export function formatValidateApiKey(key: string): boolean {
  if (key.length !== TOTAL || !key.startsWith(KEY_PREFIX)) {
    return false;
  }

  const suffix = key.slice(KEY_PREFIX.length); // random + crc tail
  for (const char of suffix) {
    if (!BASE62.includes(char)) {
      return false;
    }
  }

  const body = key.slice(0, KEY_PREFIX.length + RANDOM_LENGTH);
  const providedCrc = key.slice(KEY_PREFIX.length + RANDOM_LENGTH);
  return providedCrc === encodeBase62FixedWidth(crc32(body), CRC_LENGTH);
}

/**
 * sha256 of the full key, hex-encoded and wrapped in Postgres's `\x<hex>`
 * bytea text-input format (PostgREST over HTTP sends/receives bytea as this
 * literal string, not raw binary) — see workers/redirect/src/scan-hash.ts's
 * `toPgBytea` for the identical precedent on `scan_events.ip_hash`.
 */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `\\x${hex}`;
}

/** An api_keys row as the management UI displays it — never includes
 *  `key_hash`. Defined here rather than in app/(app)/api-keys/actions.ts
 *  because that is a "use server" file, which may export async functions only
 *  (see lib/use-server-contract.test.ts). */
export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}
