import { H2, P, Pull } from "@/components/marketing/blog/post-shell";
import { CodeBlock } from "@/components/marketing/code-block";
import { MonoStrip } from "@/components/marketing/mono-strip";

/**
 * Post 1 · what-actually-scans (P9.5-T-R). Every fact below traces to
 * packages/qr-engine/src/guardrails.ts directly, docs/guides/qr-engine.md,
 * or docs/DECISIONS.md's D6 (the 2026-07-21 adversarial decode campaigns) —
 * verified against the source file, not the docs' paraphrase of it, before
 * this shipped. The three [V] lines below are the deck's verbatim text,
 * unedited.
 */
export function WhatActuallyScansPost() {
  return (
    <>
      <P>
        A styled QR generator will let you do almost anything: shrink the quiet zone, drop a
        logo dead center, pick ink and paper that are nearly the same color. Most of them will
        let you export the result without a word of warning. The code looks finished. It renders.
        It sits in a preview window looking exactly like a QR code is supposed to look.
      </P>
      <P>
        Then it gets printed on a menu insert, or a coaster, or a sticker on a moving van, and it
        does not scan. Not sometimes. Not for one phone. It just does not resolve, and the person
        who designed it has no idea why, because nothing ever told them there was a line to cross.
      </P>
      <Pull>
        A QR code that scans on your monitor and dies on a menu is worse than an ugly one.
      </Pull>
      <P>
        We built the studio&apos;s scannability instrument to close that gap: a live score, computed
        from the exact style you are looking at, that tells you before you export whether a real
        camera in a real hand is going to be able to read the thing. The numbers behind it are not
        guesses. We measured them.
      </P>

      <H2>The campaigns</H2>
      <P>
        On 2026-07-21 we ran two adversarial decode campaigns against the engine, varying module
        shape, eye frame, dot size ratio, ink-to-paper contrast, and logo knockout, all crossed
        against each other, for 160 or more distinct style combinations. &ldquo;Adversarial&rdquo;
        here means something specific: we were not asking whether a clean SVG renders correctly.
        We rasterized every combination the way a printer or a screenshot would, then decoded the
        result with the same zxing engine (in its most tolerant, camera-simulating mode) that a
        real scanning app leans on, rather than trusting that a technically valid QR matrix always
        reads back cleanly.
      </P>
      <P>
        We are describing this honestly rather than precisely: the record we kept from that pass
        is an aggregate boundary, the worst point that still failed and the best point that still
        passed, not an itemized table of all 160-plus results. That boundary is enough to draw a
        hard line, and it is the same boundary the guardrails code has enforced ever since.
      </P>

      <H2>The boundary</H2>
      <P>
        The line we ended up drawing is about logo knockout specifically: how much of the code&apos;s
        printable area a logo, plus the padding around it, is allowed to remove. We call this the
        effective knockout ratio, and it is computed at the actual symbol version the renderer will
        use, not the version you asked for, because getting that detail wrong once shipped us a
        style that scored perfectly and did not decode.
      </P>
      <P>
        Every failing configuration in the campaign had an effective ratio of roughly 0.418 or
        higher. Every passing configuration stayed at roughly 0.407 or lower. There is a gap
        between those two numbers, and it is not an accident that our thresholds live inside it:
        we warn at 0.395 and call it an error at 0.412.
      </P>
      <Pull>
        The thresholds are not where things break. They sit in the last stretch of ground where
        nothing ever broke.
      </Pull>
      <CodeBlock
        lang="typescript"
        title="packages/qr-engine/src/guardrails.ts"
        code={`// Empirical, not theoretical (adversarial zxing campaigns, 2026-07-21).
export const LOGO_EFFECTIVE_WARN = 0.395;
export const LOGO_EFFECTIVE_ERROR = 0.412;`}
      />
      <P>
        We left margin on both sides on purpose. A style that lands exactly on 0.412 today should
        not become undecodable tomorrow because a print shop&apos;s toner ran a shade light, or
        because the phone doing the scanning has a worse camera than the one on our desk.
      </P>
      <P>
        The knockout ratio is not the only thing the campaigns changed. A logo with knockout
        enabled forces the error-correction level up to the highest one the format supports,
        automatically, no matter what you requested. The one exception is a narrower one: if you
        asked for the second-highest level and the effective ratio stays inside roughly a tenth of
        the code&apos;s area, we honor that request instead of overriding it, because the campaign
        data showed that combination held up fine. Get the exemption math wrong, gate it on the
        ratio you asked for instead of the one the renderer actually produces, and you can ship a
        code that reports itself as safe and is not. We found that failure mode once, the hard way,
        before the campaign existed, which is part of why the campaign happened at all.
      </P>

      <H2>What the instrument does today</H2>
      <P>
        The same check runs live wherever you are shaping a code: in the studio, where the report
        recomputes on every control you touch, and in the public playground on this site, where
        you can watch a logo cross the line before you have made an account. Neither surface hides
        the number behind a paywall or a settings toggle. It is just there, updating.
      </P>
      <P>
        At export, the instrument is honest about what it is: advisory, not a lock. Crossing into
        warning or error territory does not disable the download button. We tell you what the
        decode campaigns found, in plain language, and the decision stays yours. A birthday party
        flyer and a product label carry different amounts of risk a designer is willing to accept,
        and we are not in a position to make that call on your behalf.
      </P>
      <P>
        Not every rule in that instrument comes from a decode campaign, and we do not pretend
        otherwise. Contrast between ink and paper is checked the analytic way, straight from
        relative luminance math, because a decode engine reading a clean digital render cannot tell
        you anything useful about contrast: it will happily read a code at barely more than one to
        one, the way no camera on a printed, glare-lit menu ever will. So contrast stays a
        calculation, not a claim we tested against real decodes, and we say so rather than letting
        a passing test quietly stand in for something it did not check.
      </P>
      <P>
        The campaign is not a one-time event we ran once and now cite forever, either. Every new
        scanning failure anyone finds, in development, in review, or reported by someone who
        printed a code that misbehaved, becomes a permanent regression test before we consider the
        underlying bug fixed. The suite that runs in our CI today rasterizes every style preset,
        every eye shape, every ECC level, and decodes each one for real, on every single change to
        the engine.
      </P>

      <H2>Open data, open code</H2>
      <P>
        The thresholds above are not a paragraph in a design document that the code might or might
        not match. They are exported constants from the engine itself, the same values the studio,
        the playground, and this post all read from one place. If you want to see them inside the
        surrounding logic, or the contrast rules that sit beside them, the whole file is public.
      </P>
      <MonoStrip>packages/qr-engine/src/guardrails.ts, MIT-licensed, in the repo today</MonoStrip>
      <P>
        We are not asking you to take our word for any of this. Read the thresholds, read the
        campaign notes in the engine&apos;s own guide, and if you want to run your own adversarial
        pass against a style we have not tried, the decode test suite is right there to extend.
      </P>
      <Pull>
        When our instrument says scannable, it means their camera and your printer, not just our
        math.
      </Pull>
    </>
  );
}
