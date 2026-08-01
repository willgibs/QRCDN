import { describe, expect, it } from "vitest";
import { CHANGELOG_ENTRIES, CHANGELOG_TAGS, type ChangelogEntry } from "./changelog";

// A regression guard, not a one-time review: this repo's internal phase
// vocabulary (P0-P10, optionally ".5", optionally a "-U4"/"-T3a"/"-A1"/"-RT"
// unit suffix; bare "T6"/"U2"-shaped unit codes; "Checkpoint A/B/C") must
// never leak into a public-safe surface. Scanning `id` and `summary`
// programmatically is what lets this stay true as entries are added later,
// the same "prove it, don't hand-maintain it" posture lib/pricing.test.ts
// already established for /pricing's numbers.
const PHASE_CODE_RE = /\bP\d{1,2}(?:\.\d)?\b|\b[TU]\d[a-c]?\b|\bcheckpoint\s+[abc]\b/i;

function isoDateOrThrow(date: string): Date {
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const parsed = new Date(`${date}T00:00:00Z`);
  expect(Number.isNaN(parsed.getTime()), `"${date}" is not a real date`).toBe(false);
  return parsed;
}

describe("CHANGELOG_ENTRIES — shape and count", () => {
  it("has between 8 and 12 entries, per the T6 spec's own range", () => {
    expect(CHANGELOG_ENTRIES.length).toBeGreaterThanOrEqual(8);
    expect(CHANGELOG_ENTRIES.length).toBeLessThanOrEqual(12);
  });

  it("has unique, non-empty ids", () => {
    const ids = CHANGELOG_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });

  it("gives every entry at least one tag, all drawn from the closed CHANGELOG_TAGS set", () => {
    for (const entry of CHANGELOG_ENTRIES) {
      expect(entry.tags.length).toBeGreaterThan(0);
      for (const tag of entry.tags) {
        expect(CHANGELOG_TAGS).toContain(tag);
      }
    }
  });

  it("every date is a real, valid ISO calendar date (day precision)", () => {
    for (const entry of CHANGELOG_ENTRIES) {
      isoDateOrThrow(entry.date);
    }
  });

  it("is never dated in the future relative to now", () => {
    const now = Date.now();
    for (const entry of CHANGELOG_ENTRIES) {
      expect(isoDateOrThrow(entry.date).getTime()).toBeLessThanOrEqual(now);
    }
  });
});

describe("CHANGELOG_ENTRIES — ordering", () => {
  it("is sorted newest first (the order both the page and the RSS feed render in)", () => {
    const dates = CHANGELOG_ENTRIES.map((entry) => entry.date);
    const sortedDescending = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    expect(dates).toEqual(sortedDescending);
  });
});

describe("CHANGELOG_ENTRIES — public-safety rules (T6 spec)", () => {
  it("never leaks an internal phase or unit code in an id or summary", () => {
    const offenders: string[] = [];
    for (const entry of CHANGELOG_ENTRIES) {
      if (PHASE_CODE_RE.test(entry.id)) offenders.push(`id: "${entry.id}"`);
      if (PHASE_CODE_RE.test(entry.summary)) offenders.push(`summary of "${entry.id}": "${entry.summary}"`);
    }
    expect(offenders).toEqual([]);
  });

  it("never uses an em dash in a summary (customer-facing copy rule, design-system.md)", () => {
    const offenders = CHANGELOG_ENTRIES.filter((entry) => entry.summary.includes("—")).map(
      (entry) => entry.id,
    );
    expect(offenders).toEqual([]);
  });

  it("keeps every summary a single sentence ending in exactly one period", () => {
    for (const entry of CHANGELOG_ENTRIES) {
      const trimmed = entry.summary.trim();
      expect(trimmed.endsWith(".")).toBe(true);
      // Exactly one terminal period: no ". " mid-sentence (a second
      // sentence), which the spec's "one concrete sentence" rule rules out.
      expect(trimmed.slice(0, -1)).not.toContain(". ");
    }
  });

  it("never mentions a secret, key, or internal account identifier", () => {
    const forbidden = [/sb_secret_/i, /service_role/i, /account[_-]?id/i, /api[_-]?key\s*[:=]/i];
    for (const entry of CHANGELOG_ENTRIES) {
      for (const pattern of forbidden) {
        expect(entry.summary).not.toMatch(pattern);
      }
    }
  });
});

describe("ChangelogEntry — type sanity", () => {
  it("every entry round-trips through the exported type without extra fields", () => {
    const sample: ChangelogEntry = CHANGELOG_ENTRIES[0]!;
    expect(Object.keys(sample).sort()).toEqual(["date", "id", "summary", "tags"]);
  });
});
