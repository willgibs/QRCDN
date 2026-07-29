import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Code-password hashing (P7.5-U2, apps/web/lib/codes-core.ts's
// setCodeAccessCore + app/p/[slug]/actions.ts's verifyCodeAccess). Promisified
// **async** node:crypto.scrypt — deliberately NOT scryptSync. scryptSync
// blocks the whole event loop for the full cost of the hash (tens of
// milliseconds at the N below); under Vercel Fluid compute, one Node
// instance can be running several unrelated requests concurrently, so a
// blocking hash on one request stalls every other in-flight request on the
// same isolate. The async form still burns the same CPU, but yields the
// event loop between internal ticks instead of pinning it.

const SCRYPT_N = 2 ** 15; // 32768 — CPU/memory cost factor
const SCRYPT_R = 8; // block size
const SCRYPT_P = 1; // parallelization
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

// Node's scrypt() memory requirement is `128 * N * r` bytes (Node's own
// docs). At this module's N/r that's 128 * 32768 * 8 = 33,554,432 bytes —
// exactly 32 MiB, which is *exactly* Node's default `maxmem` (also
// 32 * 1024 * 1024). Node's default maxmem was sized with headroom for
// Node's OWN default cost params (N=2^14), not ours (N=2^15, double that) —
// at our N there is zero headroom between what the hash needs and what
// Node allows by default. Node's internal bookkeeping for the computation
// occasionally needs a handful of bytes beyond the theoretical minimum,
// which never shows up in a quiet local dev run but surfaces intermittently
// under concurrent production load (the exact conditions Fluid compute
// creates) as a thrown "Invalid ArrayBuffer length" / memory-limit error
// from deep inside the scrypt implementation. An explicit maxmem of 64 MiB
// (2x headroom) removes the coincidence entirely. Do not remove this, and
// do not lower it below 32 MiB without re-deriving `128 * N * r` for
// whatever N/r you change it to.
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

const SCRYPT_PREFIX = "scrypt";
// Defensive ceiling for verify's params-from-string parse (see
// verifyCodePassword below) — not a value this module will ever itself
// produce. Bounds the cost an attacker-controlled/corrupted stored string
// could force a verify call to actually pay, so a malformed row can't be
// used to DoS the verify path.
const MAX_SAFE_N = 2 ** 20;

function scryptAsync(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, { N: n, r, p, maxmem: SCRYPT_MAXMEM }, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

/**
 * Hashes `password` under a freshly drawn random salt, returning the
 * self-describing `scrypt$N$r$p$saltB64$hashB64` string to store verbatim
 * in `qr_codes.password_hash`. Every call draws its own salt (`SALT_BYTES`
 * random bytes via node:crypto's CSPRNG), so hashing the same password
 * twice never produces the same stored string.
 */
export async function hashCodePassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_KEYLEN);
  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join("$");
}

/**
 * Verifies `password` against a `scrypt$N$r$p$saltB64$hashB64` string
 * previously produced by `hashCodePassword`. The cost params (N/r/p) are
 * read FROM THE STORED STRING, never from this module's own
 * SCRYPT_N/R/P constants — this is deliberate: it's what lets a future cost
 * bump (raising SCRYPT_N above) apply to newly-set passwords without ever
 * invalidating passwords hashed under the old cost, and with no rehash
 * migration required.
 *
 * Fails closed (resolves `false`, never throws/rejects) on any malformed
 * input: wrong segment count, a non-"scrypt" prefix, a non-numeric or
 * out-of-range cost param (N capped at MAX_SAFE_N — see its comment above),
 * or salt/hash segments that don't decode to a usable length. A parse
 * failure here means "this stored value can't be a real hash," which must
 * read as "wrong password," not as a crash of the unlock flow.
 */
export async function verifyCodePassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6) {
    return false;
  }
  const [prefix, nRaw, rRaw, pRaw, saltB64, hashB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (prefix !== SCRYPT_PREFIX) {
    return false;
  }

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  if (n < 1 || n > MAX_SAFE_N || r < 1 || p < 1) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const expectedHash = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expectedHash.length === 0) {
    return false;
  }

  let derivedKey: Buffer;
  try {
    derivedKey = await scryptAsync(password, salt, n, r, p, expectedHash.length);
  } catch {
    // A still-absurd (but under-MAX_SAFE_N) param combination can exceed
    // SCRYPT_MAXMEM and make node:crypto's scrypt itself throw — that's a
    // malformed/hostile stored value, not a system failure, so it fails
    // closed the same as every other parse failure above.
    return false;
  }

  // Length-check before timingSafeEqual: it throws on mismatched-length
  // buffers rather than returning false, and a length mismatch here can
  // only mean the stored hash is corrupt (scryptAsync was asked for exactly
  // expectedHash.length bytes) — never a legitimate wrong-password case.
  if (derivedKey.length !== expectedHash.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, expectedHash);
}
