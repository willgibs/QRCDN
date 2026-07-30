// Google Safe Browsing lookup for destination URLs (D14 abuse control,
// P8-U5). Reads `process.env.SAFE_BROWSING_API_KEY` — same "unconfigured ->
// typed no-op, never throws, never blocks" contract as lib/kv-sync.ts.
//
// THE FAIL-OPEN CONTRACT (read before touching this file): an absent,
// misconfigured, rate-limited, or momentarily-down third-party API must
// NEVER stop a customer from minting or retargeting a code. "Your code
// never dies" (CLAUDE.md core positioning) cuts both ways — a free abuse
// check that occasionally can't render a verdict is not grounds to block a
// paying customer's mint. So `checkUrlSafety` has exactly ONE way to say
// "block this": `{ checked: true, safe: false }`, returned only when Google
// affirmatively reports a threat match. Every other outcome — no key
// configured, a network error, a non-2xx response, a malformed response
// body — comes back as `checked: false`, which every call site in
// lib/codes-core.ts treats as "proceed" (see the comments at each call
// site there — getting that backwards would break every mint the moment a
// key is unset or misconfigured, or the moment Google has a bad day).
//
// v4 vs v5: Google also ships a v5 hash-prefix Safe Browsing API
// (privacy-preserving — only a hash prefix of the URL ever leaves the
// caller). This module deliberately targets v4 (`threatMatches:find`)
// instead, for simplicity: one POST with the full URL, no local
// hashing/prefix-matching bookkeeping required, and destination URLs here
// are never private data (they're printed on a public QR code). v4 is not
// deprecated as of this writing, but RE-VERIFY it's still current before
// the board provisions a real key — if Google has moved v4 onto a
// deprecation path by then, migrating to v5 is a same-shaped swap
// contained entirely inside this file (the `SafetyCheck` contract below
// doesn't need to change either way).
export type SafetyCheck =
  | { checked: true; safe: boolean }
  | { checked: false; reason: "unconfigured" | "check_failed" };

const SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

// Google requires SOME client identifier on every request (used for their
// own diagnostics) — these are informational literals, not a registered
// app id that needs provisioning anywhere.
const CLIENT_ID = "qrcdn";
const CLIENT_VERSION = "1.0.0";

/** Read lazily (call-time, not module-load-time) so tests can stub the env
 *  var per-case and so a missing key never crashes import-time module
 *  init — same rationale as kv-sync.ts's readSyncEnv(). */
function readApiKey(): string | null {
  return process.env.SAFE_BROWSING_API_KEY || null;
}

interface ThreatMatchesResponse {
  matches?: unknown[];
}

/**
 * Looks up a destination URL against Google Safe Browsing's malware/
 * phishing/unwanted-software lists. See the fail-open contract at the top
 * of this file — this function NEVER throws and NEVER blocks a caller on
 * its own account; the only way it reports "unsafe" is an explicit,
 * successfully-parsed threat match from Google.
 */
export async function checkUrlSafety(url: string): Promise<SafetyCheck> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return { checked: false, reason: "unconfigured" };
  }

  try {
    const response = await fetch(
      `${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: CLIENT_ID, clientVersion: CLIENT_VERSION },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      },
    );

    if (!response.ok) {
      return { checked: false, reason: "check_failed" };
    }

    const body = (await response.json()) as ThreatMatchesResponse;
    return { checked: true, safe: !body.matches || body.matches.length === 0 };
  } catch {
    // Network error, timeout, non-JSON/garbage body, or anything else this
    // try block didn't anticipate — the fail-open contract above applies
    // uniformly: this function is never allowed to throw out of here.
    return { checked: false, reason: "check_failed" };
  }
}
