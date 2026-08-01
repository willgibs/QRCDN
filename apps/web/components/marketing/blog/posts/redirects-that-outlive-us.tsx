import { H2, P, Pull } from "@/components/marketing/blog/post-shell";
import { CodeBlock } from "@/components/marketing/code-block";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * Post 2 · redirects-that-outlive-us (P9.5-T-R). Facts trace to
 * workers/redirect/src/{index,redirect-decision,responses,kv-sync-
 * endpoint}.ts directly and docs/DECISIONS.md's D2 (as amended 2026-08-01:
 * the KV write TTL is 300s, not the stale "~60s" the original entry never
 * updated after the P5 fix). The two [V] lines are the deck's verbatim
 * text, unedited.
 */
export function RedirectsThatOutliveUsPost() {
  return (
    <>
      <P>
        A printed QR code makes a promise nobody asked it to make: that scanning it will still do
        something useful next month, next year, whenever the paper it is on finally gets thrown
        away. The code itself cannot keep that promise. It is ink. Something has to answer for it
        every time a camera points at it, on our best day and on our worst one.
      </P>
      <P>
        That something is not our application. It is not even our database. It is a small,
        separate program running on Cloudflare&apos;s edge network, and it is the only thing standing
        between a scan and a 404 the moment anything else we run has a bad day.
      </P>

      <H2>The shape</H2>
      <P>
        qrcdn.com itself, the bare domain your printed code actually points at, is served by a
        Cloudflare Worker, not by our Next.js app. The Worker keeps a cache of slug-to-destination
        records in Cloudflare KV, and treats Postgres as the source of truth behind that cache, not
        the other way around. Every scan checks KV first. Postgres only gets asked when KV has
        nothing cached for that code yet.
      </P>
      <P>
        That ordering is what makes the failure modes boring instead of catastrophic. If our web
        application is down, entirely, scans do not notice: the Worker never calls it, on any code
        path, ever. If the database is down, every code with a warm cache entry keeps resolving
        exactly as before, and even a cold one does not error. It falls through to a calm,
        unclaimed-code landing page instead of a stack trace, because a scan that cannot be
        resolved should look like &ldquo;try again later,&rdquo; never like the site is broken.
      </P>
      <P>
        Scan logging rides along on the same request without ever holding it up. The moment the
        redirect response is already on its way back to the browser, the Worker separately, in the
        background, records that the scan happened. If that background write fails for any reason,
        the person scanning the code never sees it. They already have their redirect. Nothing about
        counting a scan is allowed to be on the critical path of delivering one.
      </P>

      <H2>The contract</H2>
      <P>
        Every one of those resolved scans, whatever destination it lands on, answers the same way:
        a 302 with an explicit instruction not to cache it. There is exactly one function in the
        Worker&apos;s source that is allowed to build that response, and every redirect path funnels
        through it, so the invariant cannot quietly grow an exception somewhere.
      </P>
      <CodeBlock
        lang="bash"
        title="qrcdn.com/K7M2X9A"
        code={`curl -I https://qrcdn.com/K7M2X9A

HTTP/2 302
location: https://example.com/menu
cache-control: no-store`}
      />
      <Pull>
        Every scan answers 302 with Cache-Control: no-store. Never 301: a printed code must stay
        repointable, and a cached permanent redirect is a small death.
      </Pull>
      <P>
        A 301 tells a browser, and every proxy and DNS resolver between here and there, to
        remember this answer and stop asking. That is the correct choice for a URL that really is
        permanent. It is the wrong choice for a code sitting on a physical object you might want to
        repoint next week, because a cached 301 does not ask again. It just keeps sending people to
        wherever the code pointed the first time a browser happened to cache it, silently, for a
        duration nobody chose. We only ever use 301 for one thing, unrelated to scans: pointing a
        stray, non-slug path on the bare apex over to the real site.
      </P>

      <H2>The five minutes</H2>
      <P>
        Retargeting a code from the studio, or over the API, writes the new destination to Postgres
        and then pushes it straight into the Worker&apos;s own KV store through a small, first-party
        endpoint built for exactly that. In the common case, the very next scan already sees the
        new destination. The hard ceiling, the number we publish rather than a rounder one that
        sounds better, is the KV entry&apos;s own time-to-live: 300 seconds.
      </P>
      <P>
        That write-through endpoint is deliberately narrow: a single shared secret, checked in
        constant time so the comparison itself cannot leak information through timing, and nothing
        else. We built it as a small first-party door between our application and our own Worker
        rather than reaching for Cloudflare&apos;s general-purpose API, because a narrower door is
        easier to reason about and there was no broader access this path ever needed.
      </P>
      <P>
        That ceiling exists because of a bug we found and fixed during an earlier phase of this
        project. A backfilled KV entry, written the first time a cold slug got looked up, used to
        carry no expiry at all. If the write-through sync path that normally keeps KV current ever
        failed silently, that entry could pin a code to a stale destination forever, with nothing
        left to refresh it. The fix was blunt on purpose: every write to KV, from either code path,
        now carries the same 300-second cap, unconditionally. Worst case is five minutes of
        staleness. We would rather say that plainly than imply zero.
      </P>
      <P>
        Reading from KV carries its own short-lived hint, too, a runtime cache of up to sixty
        seconds on the lookup itself. That number governs how quickly one edge location&apos;s copy
        of an answer can go stale relative to KV, a separate concern from how long we let a whole
        record live before it must be refreshed from Postgres at all. The two numbers solve
        different problems and neither one substitutes for the other.
      </P>

      <H2>The exit</H2>
      <P>
        None of this is proprietary. The Worker is small, a few kilobytes of compiled JavaScript,
        and it is MIT-licensed in the same repository as everything else. The database schema it
        reads from is a handful of Postgres migrations, also in that repository. If you ever needed
        to point your own printed codes at infrastructure you run yourself, the schema and the
        redirect logic are the whole recipe, not a summary of it.
      </P>
      <MonoStrip>workers/redirect, MIT-licensed, ~14 KB compiled</MonoStrip>
      <Pull>your code never dies is not a slogan. It is a data path.</Pull>
    </>
  );
}
