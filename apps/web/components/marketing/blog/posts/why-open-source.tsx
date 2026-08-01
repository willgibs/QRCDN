import { H2, P, Pull } from "@/components/marketing/blog/post-shell";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * Post 4 · why-open-source (P9.5-T-R). Facts trace to the root LICENSE
 * (MIT), README.md, CONTRIBUTING.md's own "cathedral" framing, and D1's
 * apex/www split (the redirect layer is small and separable by design,
 * which is what makes "point your own worker at the schema" a real
 * statement rather than a slogan). The two [V] lines are the deck's
 * verbatim text, unedited.
 */
export function WhyOpenSourcePost() {
  return (
    <>
      <P>
        A QR code is a promise printed on something that cannot be updated. Once it is on a mug, a
        window decal, a menu insert, or a van, it is finished. Whoever printed it cannot push a
        patch to it. The only thing keeping that printed promise alive is whatever company is
        still running the server on the other end of the address it encodes, and companies do not
        last forever. When one disappears, every code it ever printed goes quiet at the same time,
        all at once, with no warning and no way for the person who printed it to do anything about
        it.
      </P>
      <P>
        That asymmetry, permanent object versus a company that might not be, is the actual problem
        a QR platform needs to answer for. Most of them do not answer for it at all. We decided the
        honest answer had to be structural, not a promise we make in a pricing page and hope to
        keep.
      </P>
      <P>
        This is not a hypothetical risk we invented to sell a feature. Vendors in this exact space
        shut down, get acquired and folded into something unrecognizable, or quietly stop renewing
        their infrastructure, and every code they ever printed for a customer goes dark at the same
        moment, with no notice period a piece of paper can receive. A menu, a shipping label, a
        parking sign: none of them get a chance to react.
      </P>

      <H2>The escrow argument</H2>
      <P>
        If our company stopped operating tomorrow, the printed codes out in the world would not
        become editable, obviously. Nobody can rewrite ink. But the thing behind those codes,
        the redirect logic, the database schema it reads from, the rules that decide what a scan
        does, all of it is already public, right now, not held in reserve for a shutdown that may
        never come. Anyone who needed to keep their own codes alive would have the entire recipe
        in front of them, today, with nothing withheld for a future crisis.
      </P>
      <Pull>
        If we ever disappear, the path off is public. That is not a marketing line; it is the
        argument that convinced us.
      </Pull>
      <P>
        We did not arrive at open source because it is fashionable for infrastructure companies to
        say. We arrived at it because it was the only answer to the asymmetry above that does not
        depend on trusting us specifically, forever, with no fallback.
      </P>

      <H2>What open means here, honestly</H2>
      <P>
        The whole repository, the QR rendering engine, the redirect worker, the web application,
        the database migrations, this site, is MIT-licensed. You can read it, fork it, run your
        own copy of the redirect layer against your own database if you ever needed to. The hosted
        service at qrcdn.com is still the actual product we sell, and being open does not change
        that.
      </P>
      <P>
        We are not building this as a bazaar where anyone&apos;s pull request can steer the roadmap.
        Small fixes, real bugs, typos, broken links, are genuinely welcome. Product direction is
        not decided in a pull request thread; it is decided by the same team running the hosted
        service, the same way it always was. Open source, for us, is a transparency and an exit
        guarantee, not a governance model.
      </P>
      <MonoStrip>MIT · public repository · built in the open, developed as a cathedral</MonoStrip>
      <P>
        We picked MIT specifically because it asks nothing of whoever ends up reading this code
        under duress. A more restrictive license can still leave a legal question mark hanging over
        someone who just needs their printed codes to keep working. MIT does not. Take it, run it,
        change it, and you do not owe us anything for doing so.
      </P>
      <P>
        The repository is not just the redirect layer. It is the QR rendering engine that decides
        what gets printed in the first place, the status page that watches the redirect contract
        from separate infrastructure, the web application and this site, and the database schema
        underneath all of it. Being open about one piece and quiet about the rest would still leave
        the actual escape hatch half built.
      </P>
      <P>
        Open does not mean unaccountable, either. We take security reports seriously and in
        private first, the same as any company would, with a public policy on how to reach us and
        what to expect once you do. Being open about the source is a different thing from being
        careless about how a real vulnerability gets handled, and we did not want either one to
        stand in for the other.
      </P>

      <H2>What you can actually verify</H2>
      <P>
        Every claim in our privacy policy about what a scan does and does not record is sitting in
        the same files that run in production, not paraphrased for a marketing page and then
        quietly different in the code. The 302-and-no-store redirect contract is enforced by one
        function every code path funnels through, and you can read exactly which function that is.
        The scannability thresholds a previous post walked through are exported constants, not
        prose that might drift from what the engine actually checks.
      </P>
      <P>
        None of that requires taking our word for it. It requires a terminal and the willingness to
        grep. The posts before this one, on what actually scans and on how redirects survive a bad
        day and how scans get counted without tracking anyone, were each written from the same
        source you can open right now: not a marketing team&apos;s summary of engineering, but the
        engineering itself, described as plainly as we could manage. Nothing in any of them is a
        claim you have to take on faith just because it appeared on a blog.
      </P>

      <Pull>
        Print something that can change its mind, from a company that cannot quietly change the
        deal.
      </Pull>
    </>
  );
}
