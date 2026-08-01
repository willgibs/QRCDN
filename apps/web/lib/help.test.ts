import { describe, expect, it } from "vitest";
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  getHelpArticle,
  helpArticlesByCategory,
  type HelpArticle,
} from "./help";

const PHASE_CODE_RE = /\bP\d{1,2}(?:\.\d)?\b|\b[TU]\d[a-c]?\b|\bcheckpoint\s+[abc]\b/i;

/** The deck's own 150-350 word body: the "Do it" steps plus the "What to
 *  expect" note, joined the way a reader would actually read the rendered
 *  page (steps in order, then the note) — never the one-line `summary`
 *  (index-only) or the cross-link labels (navigation, not body prose). */
function bodyWordCount(article: HelpArticle): number {
  const text = [...article.doIt, article.whatToExpect].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

describe("HELP_ARTICLES — shape and count", () => {
  it("has exactly the 10 launch-set articles, per the T-R deck", () => {
    expect(HELP_ARTICLES.length).toBe(10);
  });

  it("has unique, non-empty slugs", () => {
    const slugs = HELP_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug.length).toBeGreaterThan(0);
  });

  it("assigns every article to one of the 5 closed categories", () => {
    for (const article of HELP_ARTICLES) {
      expect(HELP_CATEGORIES).toContain(article.category);
    }
  });

  it("gives every article at least one Do-it step and a non-empty What-to-expect note", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.doIt.length).toBeGreaterThan(0);
      for (const step of article.doIt) expect(step.trim().length).toBeGreaterThan(0);
      expect(article.whatToExpect.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every article's Do-it + What-to-expect body inside the deck's 150-350 word range", () => {
    const counts = HELP_ARTICLES.map((a) => `${a.slug}=${bodyWordCount(a)}`).join(", ");
    const offenders = HELP_ARTICLES.filter((a) => {
      const c = bodyWordCount(a);
      return c < 150 || c > 350;
    }).map((a) => `${a.slug}=${bodyWordCount(a)}`);
    expect(offenders, `all counts: ${counts}`).toEqual([]);
  });

  it("gives every article at least one cross-link", () => {
    for (const article of HELP_ARTICLES) {
      expect(article.crossLinks.length).toBeGreaterThan(0);
    }
  });
});

describe("HELP_ARTICLES — cross-link integrity", () => {
  const realSlugs = new Set(HELP_ARTICLES.map((article) => article.slug));

  it("every /help/{slug} cross-link points at a real article", () => {
    const offenders: string[] = [];
    for (const article of HELP_ARTICLES) {
      for (const link of article.crossLinks) {
        if (link.href.startsWith("/help/")) {
          const target = link.href.slice("/help/".length);
          if (!realSlugs.has(target)) {
            offenders.push(`${article.slug} -> ${link.href}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never cross-links an article to itself", () => {
    const offenders = HELP_ARTICLES.filter((article) =>
      article.crossLinks.some((link) => link.href === `/help/${article.slug}`),
    ).map((article) => article.slug);
    expect(offenders).toEqual([]);
  });
});

describe("HELP_ARTICLES — public-safety and voice rules", () => {
  it("never leaks an internal phase or unit code anywhere in an article", () => {
    const offenders: string[] = [];
    for (const article of HELP_ARTICLES) {
      const haystacks = [article.slug, article.title, article.summary, article.whatToExpect, ...article.doIt];
      if (haystacks.some((text) => PHASE_CODE_RE.test(text))) {
        offenders.push(article.slug);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never uses an em dash anywhere in an article's rendered text", () => {
    const offenders: string[] = [];
    for (const article of HELP_ARTICLES) {
      const haystacks = [article.title, article.summary, article.whatToExpect, ...article.doIt];
      if (haystacks.some((text) => text.includes("—"))) {
        offenders.push(article.slug);
      }
    }
    expect(offenders).toEqual([]);
  });

  // No automated "no first-person-singular" scan here, unlike blog.test.ts's
  // equivalent check: help articles are a different genre from a blog
  // byline. They carry no author voice at all (pure "you/your" task
  // instructions), and a reader-perspective title like "What happens when
  // I downgrade" (article 8, the deck's own literal title text) is a
  // standard help-doc convention, not solo-founder narration — the deck's
  // "company-forward voice / no solo-founder framing" rule is stated in the
  // context of the blog's byline specifically. Manually verified instead:
  // no article body narrates as an individual ("I built," "in my
  // experience," "my team"); every instruction addresses the reader
  // directly as "you."
});

describe("helpArticlesByCategory", () => {
  it("covers every article exactly once, in HELP_CATEGORIES order", () => {
    const grouped = helpArticlesByCategory();
    expect(grouped.map(([category]) => category)).toEqual([...HELP_CATEGORIES]);
    const total = grouped.reduce((sum, [, articles]) => sum + articles.length, 0);
    expect(total).toBe(HELP_ARTICLES.length);
  });
});

describe("getHelpArticle", () => {
  it("finds every real slug", () => {
    for (const article of HELP_ARTICLES) {
      expect(getHelpArticle(article.slug)?.slug).toBe(article.slug);
    }
  });

  it("returns undefined for an unknown slug", () => {
    expect(getHelpArticle("not-a-real-article")).toBeUndefined();
  });
});
