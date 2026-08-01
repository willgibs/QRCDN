import type { Metadata } from "next";
import Link from "next/link";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { helpArticlesByCategory } from "@/lib/help";

// /help (P9.5-T-R) — a categorized index over HELP_ARTICLES (lib/help.ts).
// Poster head + reveal={false}, same reasoning /changelog, /pricing, and
// /blog's own doc comments already established for a page's one true `h1`.
// No search (deck: "Search: none") — 10 short articles under 5 categories
// is browsable without one.
export const metadata: Metadata = {
  title: "Help",
  description:
    "Short, task-first answers for QRCDN: creating codes, retargeting, access controls, billing, and your account.",
};

export default function HelpIndexPage() {
  const categories = helpArticlesByCategory();

  return (
    <Section divider="none">
      <SectionHeading
        eyebrow="Help"
        titleAs="h1"
        title="Quick answers, not a maze."
        lede="Every article is one task, one path, under 350 words. If this doesn't cover it, hello@qrcdn.com reaches a person."
        reveal={false}
      />

      <SectionBody reveal={false} className="mt-10 flex max-w-3xl flex-col gap-12">
        {categories.map(([category, articles]) => (
          <div key={category}>
            <h2 className="font-mono text-eyebrow font-semibold uppercase text-muted-foreground">
              {category}
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {articles.map((article) => (
                <li key={article.slug} className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
                  <Link
                    href={`/help/${article.slug}`}
                    className="font-display text-lg font-semibold tracking-tight text-foreground underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </SectionBody>
    </Section>
  );
}
