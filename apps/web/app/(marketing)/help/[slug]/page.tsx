import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/brand/magic";
import { Section } from "@/components/marketing/section";
import { HELP_ARTICLES, getHelpArticle } from "@/lib/help";

// /help/[slug] (P9.5-T-R) — same generateStaticParams + dynamicParams=false
// pattern as /blog/[slug] (bundled Next 16 docs' MDX dynamic-import-by-slug
// recipe, adapted to typed data): the 10 real launch articles are the only
// valid slugs, everything else 404s before this component runs. Plain
// `<h1>`, no `SectionHeading`/`Reveal` — a short reference page a visitor
// reads immediately, not a scroll-triggered marketing sequence (LegalShell's
// own reasoning, restated for help articles).
export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export const dynamicParams = false;

export async function generateMetadata(
  props: PageProps<"/help/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function HelpArticlePage(props: PageProps<"/help/[slug]">) {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) {
    notFound();
  }

  return (
    <Section rhythm="standard" divider="none">
      <div className="mx-auto flex max-w-prose flex-col">
        <Eyebrow>{article.category}</Eyebrow>
        <h1 className="font-display text-h1 font-semibold tracking-tight text-foreground">
          {article.title}
        </h1>
        <p className="mt-4 text-lede text-muted-foreground">{article.summary}</p>

        <div className="mt-10 flex flex-col gap-2">
          <h2 className="font-mono text-eyebrow font-semibold uppercase text-foreground">Do it</h2>
          <ol className="flex flex-col gap-3">
            {article.doIt.map((step, i) => (
              <li key={i} className="flex gap-3 text-base leading-relaxed text-foreground/90">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-8">
          <h2 className="font-mono text-eyebrow font-semibold uppercase text-foreground">
            What to expect
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">{article.whatToExpect}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-6">
          {article.crossLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
            >
              {link.label} →
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link
            href="/help"
            className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground"
          >
            ← All help articles
          </Link>
        </div>
      </div>
    </Section>
  );
}
