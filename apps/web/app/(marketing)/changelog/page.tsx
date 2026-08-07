import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { CHANGELOG_ENTRIES, type ChangelogEntry } from "@/lib/changelog";

// /changelog (P9.5-T6) — a static, public-safe changelog curated by hand
// from docs/STATUS.md's ledger + real git history (lib/changelog.ts is the
// single typed source; /changelog/rss.xml renders the exact same array).
// Poster head + reveal={false} follows the same pattern /pricing's own doc
// comment established (P9.5-T4/T5): titleAs="h1" is this page's one true
// title context, and SectionHeading's default scroll-triggered Reveal would
// otherwise SSR the h1 at opacity:0, gating the page's own LCP candidate
// behind an IntersectionObserver callback with nothing below the fold to
// wait for.
export const metadata: Metadata = {
  title: "Changelog",
  description: "What changed on QRCDN, and when. Real dates, real changes, written as they shipped.",
};

function ChangelogRow({ entry }: { entry: ChangelogEntry }) {
  return (
    <li id={entry.id} className="scroll-mt-24 border-t border-border/60 py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <time
          dateTime={entry.date}
          className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground"
        >
          {entry.date}
        </time>
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-mono text-[11px] text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-foreground">{entry.summary}</p>
    </li>
  );
}

export default function ChangelogPage() {
  return (
    <Section divider="none">
      <SectionHeading
        eyebrow="Changelog"
        titleAs="h1"
        title="What changed, when"
        lede="Real dates, real changes, written as they shipped. No backfilled marketing."
        reveal={false}
        aside={
          <Link
            href="/changelog/rss.xml"
            className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 transition-colors duration-(--duration-fast) ease-(--motion-ease-out) hover:text-foreground hover:underline"
          >
            RSS feed
          </Link>
        }
      />

      <SectionBody reveal={false} className="mt-10 max-w-3xl">
        <ol>
          {CHANGELOG_ENTRIES.map((entry) => (
            <ChangelogRow key={entry.id} entry={entry} />
          ))}
        </ol>
      </SectionBody>
    </Section>
  );
}
