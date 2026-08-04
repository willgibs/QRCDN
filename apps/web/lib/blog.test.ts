import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BLOG_POSTS, BLOG_TAGS, getBlogPost, type BlogPost } from "./blog";

// Mirrors lib/changelog.test.ts's shape/safety suite as closely as the two
// domains overlap. Per-fact source citations ([V]-line provenance, which
// DECISIONS.md/qr-engine.md/Worker-source sentence backs which claim) are
// verified by hand against primary sources per the T-R deck's own protocol
// and reported in the implementer's final report, the same reasoning
// changelog.test.ts never asserts anything about how a summary reads beyond
// its own literal string — no test can check "is this true," only "is this
// shaped the way the deck's rules require."
//
// What CAN be checked automatically, and is below: every [V] line ships
// byte-verbatim in its post's rendered source, no em dash or phase code
// leaks into rendered prose, no solo-founder "I" narration, and every
// post's prose word count falls inside the deck's 900-1400 range. This
// reads the post TSX files directly off disk (`lib/guardrails-excerpt.ts`'s
// own `fileURLToPath`-relative path precedent) rather than importing and
// rendering them — this repo's vitest has no jsdom/RSC rendering
// environment (node-only, per vitest.config.ts), so a source-text scan is
// the only way to see prose content from a test at all.

const POSTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "components",
  "marketing",
  "blog",
  "posts",
);

const REQUIRED_V_LINES: Record<string, readonly string[]> = {
  "what-actually-scans": [
    "A QR code that scans on your monitor and dies on a menu is worse than an ugly one.",
    "The thresholds are not where things break. They sit in the last stretch of ground where nothing ever broke.",
    // P9.7-V5: the deck line this replaces was "When our instrument says
    // scannable, it means their camera and your printer, not just our math."
    // It was retired because it is not supported. The campaigns rendered
    // styles to images and decoded them with zxing; no phone and no printed
    // sheet has ever been tested, and the deferred-verification ledger
    // (private ops repo) entry 8 has said so the whole time. Changing a locked V-line is deliberate here
    // rather than a test being bent to fit a change: the claim was wrong, so
    // the deck moved and this fixture follows it.
    "When our instrument says scannable, it means a decoder read it, at a ratio stricter than anything we ever saw fail.",
  ],
  "redirects-that-outlive-us": [
    "Every scan answers 302 with Cache-Control: no-store. Never 301: a printed code must stay repointable, and a cached permanent redirect is a small death.",
    "your code never dies is not a slogan. It is a data path.",
  ],
  "counting-without-tracking": [
    "We cannot answer questions we designed ourselves to be unable to ask.",
  ],
  "why-open-source": [
    "If we ever disappear, the path off is public. That is not a marketing line; it is the argument that convinced us.",
    "Print something that can change its mind, from a company that cannot quietly change the deal.",
  ],
};

/** JSX text-node extractor: content strictly between a bare `>` and the
 *  next `<`, skipping tags/attributes/expressions entirely. `code={\`...\`}`
 *  template contents never appear directly between a `>` and a `<` (they
 *  sit inside a `{}` attribute expression), so code samples are excluded
 *  from prose by construction, not by an extra filter. HTML entities this
 *  unit's posts actually use (`&apos;`, `&ldquo;`, `&rdquo;`) are decoded so
 *  em-dash/word-count checks read the text a visitor would actually see. */
function proseTextOf(filePath: string): string {
  const src = readFileSync(filePath, "utf8");
  const withoutImportsAndDocComment = src
    .replace(/^import[^\n]*\n/gm, "")
    .replace(/\/\*\*[\s\S]*?\*\//, "");
  const nodes = [...withoutImportsAndDocComment.matchAll(/>([^<>{}]+)</g)]
    .map((m) => m[1]!)
    .filter((t) => t.trim().length > 0);
  return nodes
    .join(" ")
    .replaceAll("&ldquo;", '"')
    .replaceAll("&rdquo;", '"')
    .replaceAll("&apos;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const REQUIRED_SLUGS = [
  "what-actually-scans",
  "redirects-that-outlive-us",
  "counting-without-tracking",
  "why-open-source",
] as const;

const PHASE_CODE_RE = /\bP\d{1,2}(?:\.\d)?\b|\b[TU]\d[a-c]?\b|\bcheckpoint\s+[abc]\b/i;

function isoDateOrThrow(date: string): Date {
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const parsed = new Date(`${date}T00:00:00Z`);
  expect(Number.isNaN(parsed.getTime()), `"${date}" is not a real date`).toBe(false);
  return parsed;
}

describe("BLOG_POSTS — shape and count", () => {
  it("has exactly the 4 launch-set posts, per the T-R deck", () => {
    expect(BLOG_POSTS.length).toBe(4);
    const slugs = BLOG_POSTS.map((post) => post.slug).sort();
    expect(slugs).toEqual([...REQUIRED_SLUGS].sort());
  });

  it("has unique, non-empty slugs", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug.length).toBeGreaterThan(0);
  });

  it("gives every post exactly one byline: Will Gibson (company-forward voice, not a solo-founder credit)", () => {
    for (const post of BLOG_POSTS) {
      expect(post.byline).toBe("Will Gibson");
    }
  });

  it("gives every post at least one tag, all drawn from the closed BLOG_TAGS set", () => {
    for (const post of BLOG_POSTS) {
      expect(post.tags.length).toBeGreaterThan(0);
      for (const tag of post.tags) {
        expect(BLOG_TAGS).toContain(tag);
      }
    }
  });

  it("every date is a real, valid ISO calendar date (day precision), never in the future", () => {
    const now = Date.now();
    for (const post of BLOG_POSTS) {
      expect(isoDateOrThrow(post.date).getTime()).toBeLessThanOrEqual(now);
    }
  });

  it("dates the whole launch set 2026-08-01, per the deck's own instruction", () => {
    for (const post of BLOG_POSTS) {
      expect(post.date).toBe("2026-08-01");
    }
  });
});

describe("BLOG_POSTS — public-safety and voice rules", () => {
  it("never leaks an internal phase or unit code in a slug, title, or dek", () => {
    const offenders: string[] = [];
    for (const post of BLOG_POSTS) {
      if (PHASE_CODE_RE.test(post.slug)) offenders.push(`slug: "${post.slug}"`);
      if (PHASE_CODE_RE.test(post.title)) offenders.push(`title of "${post.slug}": "${post.title}"`);
      if (PHASE_CODE_RE.test(post.dek)) offenders.push(`dek of "${post.slug}": "${post.dek}"`);
    }
    expect(offenders).toEqual([]);
  });

  it("never uses an em dash in a title or dek (no-em-dash copy rule, design-system.md)", () => {
    const offenders = BLOG_POSTS.filter(
      (post) => post.title.includes("—") || post.dek.includes("—"),
    ).map((post) => post.slug);
    expect(offenders).toEqual([]);
  });

  it("never narrates in first-person singular in a title or dek (company-forward voice)", () => {
    // Word-boundary "I"/"I'm"/"I've" etc. — deliberately not "we"/"our",
    // which the deck explicitly allows ("no 'I' narration except where a
    // first-person plural fits").
    const soloFounderRe = /\bI\b|\bI'(?:m|ve|ll|d)\b|\bmy\b/i;
    const offenders = BLOG_POSTS.filter(
      (post) => soloFounderRe.test(post.title) || soloFounderRe.test(post.dek),
    ).map((post) => post.slug);
    expect(offenders).toEqual([]);
  });
});

describe("BlogPost — type sanity", () => {
  it("every entry round-trips through the exported type without extra fields", () => {
    const sample: BlogPost = BLOG_POSTS[0]!;
    expect(Object.keys(sample).sort()).toEqual(["byline", "date", "dek", "slug", "tags", "title"]);
  });
});

describe("post bodies (components/marketing/blog/posts/*.tsx) — deck compliance", () => {
  it.each(BLOG_POSTS.map((post) => [post.slug, post] as const))(
    "%s: 900-1400 prose words",
    (_slug, post) => {
      const text = proseTextOf(join(POSTS_DIR, `${post.slug}.tsx`));
      const count = wordCount(text);
      expect(count, `${post.slug} has ${count} prose words`).toBeGreaterThanOrEqual(900);
      expect(count, `${post.slug} has ${count} prose words`).toBeLessThanOrEqual(1400);
    },
  );

  it.each(BLOG_POSTS.map((post) => [post.slug, post] as const))(
    "%s: no em dash in rendered prose",
    (_slug, post) => {
      const text = proseTextOf(join(POSTS_DIR, `${post.slug}.tsx`));
      expect(text.includes("—")).toBe(false);
    },
  );

  it.each(BLOG_POSTS.map((post) => [post.slug, post] as const))(
    "%s: no internal phase or unit code in rendered prose",
    (_slug, post) => {
      const text = proseTextOf(join(POSTS_DIR, `${post.slug}.tsx`));
      expect(PHASE_CODE_RE.test(text)).toBe(false);
    },
  );

  it.each(BLOG_POSTS.map((post) => [post.slug, post] as const))(
    "%s: no solo-founder first-person-singular narration",
    (_slug, post) => {
      const text = proseTextOf(join(POSTS_DIR, `${post.slug}.tsx`));
      const soloFounderRe = /\bI\b|\bI'(?:m|ve|ll|d)\b|\bmy\b/;
      expect(soloFounderRe.test(text)).toBe(false);
    },
  );

  it.each(
    Object.entries(REQUIRED_V_LINES).flatMap(([slug, lines]) =>
      lines.map((line, i) => [`${slug} [V${i + 1}]`, slug, line] as const),
    ),
  )("%s ships byte-verbatim", (_label, slug, line) => {
    const text = proseTextOf(join(POSTS_DIR, `${slug}.tsx`));
    expect(text).toContain(line);
  });
});

describe("getBlogPost", () => {
  it("finds every real slug", () => {
    for (const slug of REQUIRED_SLUGS) {
      expect(getBlogPost(slug)?.slug).toBe(slug);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getBlogPost("not-a-real-post")).toBeUndefined();
  });
});
