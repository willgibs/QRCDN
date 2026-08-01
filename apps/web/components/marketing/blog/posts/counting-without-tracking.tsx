import { H2, P, Pull } from "@/components/marketing/blog/post-shell";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * Post 3 · counting-without-tracking (P9.5-T-R). Facts trace to
 * workers/redirect/src/{scan-hash,ingest,geo,ua}.ts, migration
 * 20260723000007_scan_rollup.sql, apps/web/lib/analytics.ts, and
 * apps/web/lib/codes-core.ts's getCodeAnalyticsCore (the "today" live
 * query). The [V] line is the deck's verbatim text, unedited. The deck asks
 * for the hash formula as a mono line, not a fake code sample: MonoStrip
 * below, no CodeBlock.
 */
export function CountingWithoutTrackingPost() {
  return (
    <>
      <P>
        Whoever owns a code wants to know it is working: how many scans, from where, on what kind
        of device, whether a campaign is landing. Whoever scans a code wants none of that to turn
        into a profile of them. Most analytics products resolve that tension by picking a side,
        usually the owner&apos;s, and hoping the scanner never reads the privacy policy closely
        enough to notice. We tried to resolve it a different way: build the system so the tension
        cannot come up.
      </P>

      <H2>The mechanism</H2>
      <P>
        Every scan that reaches our edge worker gets a device signal reduced to one thing: a
        one-way hash of the visitor&apos;s IP address, combined with a salt that changes automatically
        at every UTC midnight. Nothing rotates it on a schedule we have to remember to run. The
        date itself is part of the input, so yesterday&apos;s salt is simply gone once the date rolls
        over, and there is no key anywhere that could reconstruct it.
      </P>
      <MonoStrip>ip_hash = sha256(ip + daily_salt), daily_salt rotates at UTC midnight</MonoStrip>
      <P>
        That single design choice does two things at once. Within one day, the same hash means the
        same visitor, so we can still tell you a code got forty unique scans and not just forty
        scans. Across two different days, that same visitor produces two mathematically unrelated
        hashes. There is no computation, ours or anyone else&apos;s, that turns Tuesday&apos;s hash back
        into Wednesday&apos;s, or back into an IP address at all.
      </P>
      <Pull>We cannot answer questions we designed ourselves to be unable to ask.</Pull>
      <P>
        That is not a policy promise sitting on top of a system that could technically do more if
        we changed our minds. It is a property of what gets written down in the first place. A raw
        IP address is never stored, not temporarily, not in a log we promise to delete later. The
        hash is the only thing that ever reaches our database.
      </P>
      <P>
        There is also nothing sitting on the scanning side of this to notice. A scan sets no
        cookie, needs no account, and runs no fingerprinting script that inspects a browser&apos;s
        fonts, canvas rendering, or installed plugins to reconstruct an identity by other means.
        The redirect is a plain HTTP response. The device on the other end never has to load
        anything, or agree to anything, for us to still be able to count it once, correctly, for
        that one day.
      </P>

      <H2>What we keep, what we never touch</H2>
      <P>
        A scan event carries the code it hit, a country, a region, and a city, read from
        Cloudflare&apos;s edge network at request time rather than looked up from an IP address
        ourselves. It carries a coarse device class, phone or tablet or desktop, parsed from the
        browser&apos;s own user-agent string. It carries the referring page&apos;s hostname, if the
        browser sent one, never the full URL, since a referring page&apos;s path or query string can
        itself carry information that has nothing to do with us.
      </P>
      <P>
        It never carries a raw IP address. It never carries anything more precise than
        city-level location, no GPS, no street address. And because of the daily salt, it never
        carries anything that identifies the same visitor across two different days. That last one
        holds even for us, with full access to our own database, and it holds for anyone who ever
        obtained that data some other way.
      </P>

      <H2>The pipeline</H2>
      <P>
        Individual scan events land in an append-only table at the moment they happen, written
        by the edge worker in the background, after the redirect has already been sent, never
        blocking it. Once an hour, a scheduled job rolls those raw events up into per-code,
        per-day totals: scan counts, unique-visitor counts, and the top countries, devices, and
        referrers behind them. A code&apos;s dashboard reads from those rollups, not from the raw
        table, for everything except one number.
      </P>
      <P>
        &ldquo;Scans today&rdquo; reads live, straight from the raw events, because the hourly rollup can
        lag up to an hour behind and a number that says zero when three people just scanned your
        new poster is worse than no number at all. Everything else, every chart, every
        country breakdown, comes from the rollup. Bots we can identify, based on request method
        and user-agent, never make it into either layer in the first place.
      </P>
      <P>
        A country or a referrer breakdown could, in theory, grow without bound: a code that goes
        genuinely viral might see traffic from a hundred different countries and thousands of
        distinct referring pages in a single day. Rather than let that turn one popular code&apos;s
        row into an ever-growing blob, each breakdown keeps its fifty largest buckets and folds
        everything past that into a plainly labeled remainder. No visit is ever silently dropped
        to keep a row small; it just stops being broken out individually once the list is already
        long enough to answer the question a chart is for.
      </P>
      <P>
        None of it stays forever, either. Raw scan events aged past a set window, thirty days on
        the free plan and a year on Pro, are deleted on a daily schedule, even though the daily
        totals they fed into stick around so an owner never loses their historical counts. We are
        not just declining to look at raw data closely; we are actively getting rid of it once it
        has done its job.
      </P>

      <H2>Why the numbers will not match your web analytics</H2>
      <P>
        If you also run ordinary website analytics, and you compare its numbers to ours, they will
        not agree, and that is not a bug in either one. A scan is someone pointing a camera at a
        physical object on purpose. A page view is someone&apos;s browser loading a URL, sometimes on
        purpose, sometimes via a redirect, a preview bot, or a tab someone forgot was open. They
        are different doors into different rooms, counted by different rules, and both readings can
        be correct at once. Our own marketing site uses cookieless visitor analytics for exactly
        this reason: the same stance, applied everywhere we count anything.
      </P>
      <P>
        None of this asks you to trust a paragraph on a privacy page. The hashing, the rollup
        function, the columns a scan event is and is not allowed to carry: all of it sits in the
        same public repository as everything else we ship, verifiable by anyone willing to read
        it rather than take our word for it.
      </P>
    </>
  );
}
