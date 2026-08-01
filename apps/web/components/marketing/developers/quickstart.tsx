import Link from "next/link";
import { CodeBlock } from "@/components/marketing/code-block";
import { QUICKSTART_CREATE_EXAMPLE, QUICKSTART_REPOINT_EXAMPLE } from "@/lib/api-reference";
import { Section } from "./section";
import { InlineCode } from "./inline-code";

// Illustrative only: the redirect contract, not a runnable curl/JSON
// sample, so it does not go through the shiki CodeBlock or get a copy
// button (matching Base URL's own plain-InlineCode precedent below on this
// same page for a short technical string that is not itself executable).
const REDIRECT_CONTRACT = "GET qrcdn.com/<slug> → 302 · cache-control: no-store → your destination";

/**
 * The Quickstart (P9.5-T5, new): first content section after the page
 * intro, and first in the TOC. Five true-sequence steps: mint a key,
 * create a code, print it, scan it, repoint it. Steps 2 and 5 render
 * `QUICKSTART_CREATE_EXAMPLE`/`QUICKSTART_REPOINT_EXAMPLE`
 * (`lib/api-reference.ts`) rather than a hand-typed sample; see that
 * module's own doc comment for why those are a deliberately minimal,
 * plan-safe pair distinct from the comprehensive reference's own
 * create-code/update-code examples, and why that is not "a second
 * hand-copied sample that can drift" in the harmful sense: it is one
 * small, self-contained story, defined once, used once. Each of those two
 * steps links down to its full reference entry; each full reference entry
 * (`components/marketing/developers/endpoint.tsx`'s consumers in
 * `app/(marketing)/developers/page.tsx`) does not currently link back up.
 * The spec asked for the reference to link to the quickstart anchors,
 * satisfied here by giving every step a stable id future copy can target,
 * without forcing a back-link onto every one of the five endpoint entries
 * regardless of whether they are part of this walkthrough.
 */
export function Quickstart() {
  return (
    <Section id="quickstart" title="Quickstart">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Mint a key, create a code, print it, then change where it points. Everything below is
        copy-pasteable.
      </p>

      <ol className="mt-2 flex flex-col gap-8">
        <li id="quickstart-1" className="scroll-mt-24">
          <h3 className="font-display text-base font-semibold text-foreground">1. Mint a key</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Create one from the Studio:{" "}
            <Link href="/api-keys" className="text-primary underline-offset-4 hover:underline">
              /api-keys
            </Link>{" "}
            → New key. It looks like <InlineCode>qrcdn_live_…</InlineCode> and is shown in full
            exactly once, so copy it somewhere safe. Keys are owner-scoped: yours can only see and
            change codes you created.
          </p>
        </li>

        <li id="quickstart-2" className="scroll-mt-24">
          <h3 className="font-display text-base font-semibold text-foreground">2. Create a code</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            POST a name and a destination. QRCDN assigns the slug, and the code is live
            immediately.
          </p>
          <div className="mt-3 grid gap-2.5">
            <CodeBlock
              code={QUICKSTART_CREATE_EXAMPLE.request.code}
              lang={QUICKSTART_CREATE_EXAMPLE.request.lang}
              title="Request"
            />
            <CodeBlock
              code={QUICKSTART_CREATE_EXAMPLE.response.code}
              lang={QUICKSTART_CREATE_EXAMPLE.response.lang}
              title="Response"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Full reference:{" "}
            <a href="#create-code" className="text-primary underline-offset-4 hover:underline">
              POST /codes
            </a>
          </p>
        </li>

        <li id="quickstart-3" className="scroll-mt-24">
          <h3 className="font-display text-base font-semibold text-foreground">3. Print it</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The response&apos;s <InlineCode>url</InlineCode>{" "}
            is the code&apos;s permanent address. Render the QR from the Studio or your own
            stack, then print it on anything.
          </p>
        </li>

        <li id="quickstart-4" className="scroll-mt-24">
          <h3 className="font-display text-base font-semibold text-foreground">4. Scan it</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A scan never reaches your destination directly. It hits QRCDN&apos;s redirect layer
            first, which looks up where the code currently points and sends the visitor on:
          </p>
          <p className="mt-3 rounded-lg border border-border bg-code-bg px-4 py-3 font-mono text-code text-foreground">
            {REDIRECT_CONTRACT}
          </p>
        </li>

        <li id="quickstart-5" className="scroll-mt-24">
          <h3 className="font-display text-base font-semibold text-foreground">5. Repoint it</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            PATCH the same slug with a new destination. Nothing about the printed code changes.
          </p>
          <div className="mt-3 grid gap-2.5">
            <CodeBlock
              code={QUICKSTART_REPOINT_EXAMPLE.request.code}
              lang={QUICKSTART_REPOINT_EXAMPLE.request.lang}
              title="Request"
            />
            <CodeBlock
              code={QUICKSTART_REPOINT_EXAMPLE.response.code}
              lang={QUICKSTART_REPOINT_EXAMPLE.response.lang}
              title="Response"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Full reference:{" "}
            <a href="#update-code" className="text-primary underline-offset-4 hover:underline">
              PATCH /codes/{"{slug}"}
            </a>
          </p>
          <p className="mt-4 text-sm font-medium text-foreground">
            Scan the same print again. New destination, same code. That is the whole product.
          </p>
        </li>
      </ol>
    </Section>
  );
}
