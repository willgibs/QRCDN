// Coarse UA parsing for scan ingest (D3: "coarse UA parse", not a full
// browser/OS parser — scan_events.device stores this class; os/browser
// columns are deliberately left null, see the final report's deviations
// section). Pure string matching, no dependencies.

export type DeviceClass = "mobile" | "tablet" | "desktop" | "bot";

// Common bot/crawler/monitoring UA substrings. Not exhaustive (no UA list
// ever is) — this is the ingest-time bot filter from D3, accepting that a
// determined bot can still slip a scan_events row in (same <0.5% loss/noise
// tolerance the ingest pipeline already accepts).
const BOT_TOKENS = [
  "bot",
  "spider",
  "crawl",
  "slurp",
  "bingpreview",
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "headlesschrome",
  "google-inspectiontool",
  "pingdom",
  "uptimerobot",
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "petalbot",
  "postman",
];

/** True for bot/crawler/monitoring UAs and for missing UAs (a real browser
 *  always sends one; treat absence conservatively as bot-like so ingest
 *  skips it rather than logging a hit with no useful signal). */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) {
    return true;
  }
  const lower = userAgent.toLowerCase();
  return BOT_TOKENS.some((token) => lower.includes(token));
}

const TABLET_KEYWORD_PATTERN = /ipad|tablet|kindle|playbook|nexus (7|9|10)/i;
const ANDROID_PATTERN = /android/i;
const MOBILE_PATTERN = /mobi|iphone|ipod|blackberry|windows phone|opera mini/i;

/** Coarse device class from the UA string. Order matters: bot check first,
 *  then explicit tablet keywords, then the standard Android heuristic
 *  (Android UAs omit "Mobile" on tablets, include it on phones), then the
 *  general mobile pattern, defaulting to desktop. Known unfixable gap:
 *  iPadOS 13+ Safari in default desktop mode reports a plain Macintosh UA
 *  with no touch signal available to a UA string alone — classifies as
 *  desktop, which is an accepted limitation of "coarse" parsing (D3). */
export function classifyDevice(userAgent: string | null | undefined): DeviceClass {
  if (isBotUserAgent(userAgent)) {
    return "bot";
  }
  const value = userAgent ?? "";
  if (TABLET_KEYWORD_PATTERN.test(value)) {
    return "tablet";
  }
  if (ANDROID_PATTERN.test(value)) {
    return MOBILE_PATTERN.test(value) ? "mobile" : "tablet";
  }
  if (MOBILE_PATTERN.test(value)) {
    return "mobile";
  }
  return "desktop";
}
