import { Section, SectionHeading, SectionBody } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { assertRepoPaths } from "@/lib/open-source";
import { definePrintCode, PrintCodeDefs } from "@/components/marketing/print-mat";
import { cn } from "@/lib/utils";

/**
 * 11 — Open source (P9.10-D6.1). Rebuilt on the board's reference (Railway's
 * "Build and deploy" section, curated by Mobbin) — three parallel cards over
 * one full-length strip.
 *
 * R1 offered a manifest and a code panel and the board took neither: "A is
 * better than B in my opinion just because it feels cooler with the code. B
 * feels very bland." Both notes are right and they pull opposite ways, which
 * is what the reference resolves. The cards carry what the manifest carried
 * (what is public, piece by piece, each linking into the real tree) but as
 * objects rather than table rows; the strip is where the code goes, full
 * width, which is a better home for it than a panel wedged beside prose — and
 * it is the thing pointing at the repository.
 *
 * Everything here is checkable. The card paths are verified against disk at
 * build (`lib/open-source.ts`), and the strip's line is sliced out of a
 * verbatim read of `workers/redirect/src/responses.ts`, never a hand-typed
 * literal that could drift from the code it claims to quote.
 */

const REPO_URL = "https://github.com/willgibs/QRCDN";

/** 16-grid line icon: the idiom 09's feature strip established at D2 and 05
 *  reused at D5, so every feature family on the landing reads as one set. */
function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  box: "M8 2.2 13.4 5v6L8 13.8 2.6 11V5L8 2.2ZM2.6 5 8 7.8 13.4 5M8 7.8v6",
  check: "M3.2 8.4 6.4 11.6l6.4-6.4",
  shield: "M8 2.4 13 4.2v3.9c0 3-2.1 5-5 5.5-2.9-.5-5-2.5-5-5.5V4.2L8 2.4Z",
  bolt: "M8.9 2.3 4.1 9.1h3.3l-.5 4.6 4.9-6.9H8.5l.4-4.5Z",
  globe: "M8 2.6a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8ZM2.9 8h10.2M8 2.6c1.4 1.5 2.1 3.4 2.1 5.4S9.4 11.9 8 13.4c-1.4-1.5-2.1-3.4-2.1-5.4S6.6 4.1 8 2.6Z",
  layers: "M8 2.6 2.9 5.3 8 8l5.1-2.7L8 2.6ZM2.9 8.2 8 10.9l5.1-2.7M2.9 11.1 8 13.8l5.1-2.7",
  lock: "M4.9 7.1V5.4a3.1 3.1 0 0 1 6.2 0v1.7M3.9 7.1h8.2v6.3H3.9V7.1Z",
  window: "M2.8 4.1h10.4v7.8H2.8V4.1ZM2.8 6.6h10.4",
} as const;

type Card = {
  icon: keyof typeof ICONS;
  title: string;
  desc: string;
  dir: string;
  items: ReadonlyArray<{ icon: keyof typeof ICONS; label: string }>;
};

/**
 * Three cards, one per piece a visitor would actually want to check. The five
 * workspace packages collapse to three groups because three parallel objects
 * read as a system where five rows read as an inventory, and because the
 * engine's two halves (renderer and schema) are one story, as are the app and
 * the schema behind it.
 *
 * Every sub-item is a fact the repo holds: the two adversarial zxing decode
 * campaigns in docs/guides/qr-engine.md, the CLAUDE.md redirect rule, the
 * D16 data path, the privacy posture, the RLS migrations.
 */
const CARDS: readonly Card[] = [
  {
    icon: "box",
    title: "The engine",
    desc: "Draws every code you make.",
    dir: "packages/qr-engine",
    items: [
      { icon: "check", label: "Certified across 160+ decode combos" },
      { icon: "shield", label: "Warns before a design stops scanning" },
      { icon: "layers", label: "Styles you save keep working forever" },
    ],
  },
  {
    icon: "globe",
    title: "The redirect worker",
    desc: "Answers every scan, at the edge.",
    dir: "workers/redirect",
    items: [
      { icon: "bolt", label: "302 and no-store, never a 301" },
      { icon: "globe", label: "Runs on Cloudflare, not our app" },
      { icon: "shield", label: "Keeps working if our site goes down" },
    ],
  },
  {
    icon: "window",
    title: "The app and its schema",
    desc: "The studio, the dashboard and the API.",
    dir: "apps/web",
    items: [
      { icon: "lock", label: "Every table and every access rule" },
      { icon: "shield", label: "Raw IPs never stored" },
      { icon: "window", label: "This page you are reading" },
    ],
  },
];

// Build-time guard: a card whose directory has moved or been renamed fails
// the build rather than shipping a link into a 404.
assertRepoPaths(CARDS.map((c) => c.dir));

function FeatureCard({ card }: { card: Card }) {
  return (
    <a
      href={`${REPO_URL}/tree/main/${card.dir}`}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card/40 p-6 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) hover:border-foreground/25 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="lit-stroke mb-5 grid size-9 place-items-center rounded-[11px] text-foreground">
        <Glyph d={ICONS[card.icon]} />
      </span>
      <span className="text-[1.0625rem] leading-snug font-medium text-foreground">{card.title}</span>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-balance text-muted-foreground">
        {card.desc}
      </p>

      <ul className="mt-6 flex flex-col">
        {card.items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 border-t border-border/70 py-3 text-[0.875rem] text-muted-foreground"
          >
            <Glyph d={ICONS[item.icon]} className="size-3.5 shrink-0 text-muted-foreground/70" />
            {item.label}
          </li>
        ))}
      </ul>

      {/* The path is the receipt: it is what you would type to find this, and
          it is the same string lib/open-source.ts asserts against disk. */}
      <span className="mt-5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/70 transition-colors duration-(--duration-normal) ease-(--motion-ease-out) group-hover:text-foreground">
        {card.dir}
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="size-3 transition-transform duration-(--duration-normal) ease-(--motion-ease-out) group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 10.5 10.5 5.5M6.2 5.5h4.3v4.3" />
        </svg>
      </span>
    </a>
  );
}

/**
 * The full-length strip, rebuilt at the board's second note as a pointer to
 * the repository rather than a quotable line: "use the full strip as a more
 * visually beautiful pointer to our Github repo, like the screenshot but
 * with a subtle and beautiful background pattern faded." Reference: Linear's
 * closing band (statement left, two actions right), curated by Mobbin.
 *
 * The pattern is the master plan's unspent MODULE FIELD (device #6, "our
 * dots are real: deterministic QR module fields as ambient atmosphere"). It
 * is a real engine render of the repository's own URL, so the texture behind
 * "read the source" IS the address the buttons go to — not a generic dot
 * grid dressed up as one, which the QR solidity rule (D0 note 5) would have
 * forbidden anyway.
 *
 * Deliberately scaled far past the strip and bled off both edges so it reads
 * as pattern rather than as a code: at this size a viewer sees three or four
 * modules across a finder pattern, never a symbol, so nobody is invited to
 * point a phone at a texture that would not decode. The fade is a mask, not
 * an opacity ramp, so the modules keep their own crisp edges as they go.
 *
 * The old MonoStrip and LearnMoreLink foot retired into this band: it now
 * carries the licence, the disclosure address and both actions, which is
 * what those two elements were doing separately and less well.
 */
const REPO_FIELD = definePrintCode("HTTPS://GITHUB.COM/WILLGIBS/QRCDN", "repo-field", "field");

function RepoStrip() {
  return (
    <div className="os-strip relative overflow-hidden rounded-2xl border border-border bg-card/40 px-7 py-8 sm:px-10 sm:py-9">
      <svg
        viewBox={REPO_FIELD.viewBox}
        aria-hidden
        className="os-field pointer-events-none absolute top-1/2 -right-[3%] h-[420%] w-auto -translate-y-1/2"
      >
        <use href={`#${REPO_FIELD.id}`} />
      </svg>

      {/* `relative` lifts the content over the field. The field cannot use a
          negative z-index: it would drop behind the strip's own background,
          which is exactly where it disappeared to on the first attempt. */}
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="flex flex-col gap-2">
          <p className="text-h3 font-display font-semibold text-balance text-foreground">
            Read the source
          </p>
          <p className="font-mono text-[11.5px] text-muted-foreground">
            MIT licensed · disclosure: hello@qrcdn.com
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
              Report an issue
            </a>
          </Button>
          <Button asChild>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              View the repo
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OpenSourceSection({ index }: { index: string }) {
  return (
    <Section id="open-source" variant="stack" surface="floor" divider="none">
      <SectionHeading
        eyebrow="Open source"
        index={index}
        title="Verify our platform yourself"
        lede="Three pieces, all MIT and all public. Read whichever one worries you."
        className="mb-block"
      />
      <PrintCodeDefs codes={[REPO_FIELD]} />
      <SectionBody className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <FeatureCard key={card.dir} card={card} />
        ))}
      </SectionBody>
      <SectionBody delay={0.15} className="mt-4">
        <RepoStrip />
      </SectionBody>
    </Section>
  );
}
