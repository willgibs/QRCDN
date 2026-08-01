// Single typed source of truth for /help and /help/[slug] (P9.5-T-R).
// Task-first, short (150-350 words per article: doIt steps + whatToExpect
// combined), no screenshots ("they rot; the words are precise" — the
// deck's own line). Every step below was checked against the real
// UI/handlers it describes before being written, not assumed from the
// feature's own marketing copy — see the implementer's final report for
// the per-article verification notes, and article 10 specifically for the
// account-deletion truth-check (self-serve deletion does not exist in the
// product today; the honest current path is a request to hello@).
//
// Entitlement numbers below (PLAN_LIMITS/PRICING) and the vanity-slug
// charset (SLUG_CHARSET) are imported, never hand-typed, per the CLAUDE.md
// hard rule ("entitlement limits live in lib/entitlements.ts only") and
// the same "never re-type what a constant already owns" precedent
// lib/pricing.ts and the legal pages already established.

import { PLAN_LIMITS } from "./entitlements";
import { SLUG_CHARSET } from "./slug";

export const HELP_CATEGORIES = [
  "Getting started",
  "Codes",
  "Access",
  "Billing & plans",
  "Account",
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export interface HelpCrossLink {
  label: string;
  /** An internal /help/{slug} path, another in-app route, or a mailto:. */
  href: string;
}

export interface HelpArticle {
  slug: string;
  category: HelpCategory;
  title: string;
  /** One line, index-only — not part of the 150-350 word body count. */
  summary: string;
  /** The one "Do it" path — ordered steps. */
  doIt: readonly string[];
  /** The one "What to expect" note — a single paragraph. */
  whatToExpect: string;
  crossLinks: readonly HelpCrossLink[];
}

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: "create-a-dynamic-code",
    category: "Getting started",
    title: "Create your first dynamic code",
    summary: "Design a code in the studio and mint it as a live, retargetable link.",
    doIt: [
      "Sign in and open the Studio.",
      "Shape the code on the left: dot style, eye frame, ink and paper colors, and an optional logo. None of this affects whether it works, only how it looks, and the live scannability reading beside it updates as you go.",
      "Under Payload, enter the Destination URL you want the code to open when scanned.",
      `Click "Create dynamic code," confirm a name (or keep the one suggested from your destination), and press Enter.`,
      "Optionally, expand \"Customize link\" first if you want to pick your own short link instead of a random one (Pro).",
      "Download the artifact as SVG or PNG from the Export section, lower on the rail.",
    ],
    whatToExpect:
      "The moment you create the code, the QR artifact on stage becomes the real, live thing: its payload is now a permanent qrcdn.com short link, not your destination URL directly. That indirection is what makes the code retargetable later without reprinting it. A confirmation shows the new short link with a one-click copy, and the code immediately appears in your Codes list below, ready to retarget, pause, or protect whenever you need to. What you print never has to change again, only where it points.",
    crossLinks: [
      { label: "Retarget a code", href: "/help/retarget-a-code" },
      { label: "Export formats and print quality", href: "/help/export-formats-and-print-quality" },
    ],
  },
  {
    slug: "retarget-a-code",
    category: "Codes",
    title: "Retarget a code",
    summary: "Change where a printed code sends people, without reprinting anything.",
    doIt: [
      `In the Studio's Codes list, open the code's actions menu (the "⋯" button).`,
      `Choose "Retarget…," type the new destination, and confirm.`,
      `Over the API instead: PATCH /api/v1/codes/{slug} with a JSON body of {"destination": "https://..."}.`,
    ],
    whatToExpect:
      "In the common case the very next scan already lands on the new destination. The hard ceiling, published rather than rounded down to sound better, is five minutes: that is how long the edge cache is allowed to hold a stale answer if the instant sync step doesn't land, which the studio tells you about with a small \"propagating\" note rather than hiding it. The printed artifact itself never changes, only what it resolves to, and a code's scan history and count carry straight through a retarget: nothing resets. You can retarget the same code as many times as you like, forever, on any plan, at no cost beyond your own patience with typing in a new URL.",
    crossLinks: [
      { label: "Pause and resume a code", href: "/help/pause-and-resume-a-code" },
      { label: "API reference", href: "/developers" },
    ],
  },
  {
    slug: "pause-and-resume-a-code",
    category: "Codes",
    title: "Pause and resume a code",
    summary: "Take a code offline temporarily without deleting it.",
    doIt: [
      `In the Codes list, open the code's actions menu and choose "Pause."`,
      `To bring it back later, open the same menu again and choose "Resume."`,
    ],
    whatToExpect:
      "Neither action needs a confirmation, and both are instantly reversible, on any plan, as many times as you like. While a code is paused, scanners land on a calm, neutral page that says the code isn't live right now, never an error and never a 404, so nobody who scans it thinks something is broken. Scans against a paused code still get counted; pausing changes where a scan goes, not whether it happened. Pause is the right tool for a temporary hold, a sold-out product, an event that hasn't started yet, where you know you'll want the exact same destination back later; if you actually want the code to stop working on a fixed date instead, an expiry is the more precise tool for that.",
    crossLinks: [
      { label: "Retarget a code", href: "/help/retarget-a-code" },
      { label: "Set or clear an expiry", href: "/help/set-or-clear-an-expiry" },
    ],
  },
  {
    slug: "password-protect-a-code",
    category: "Access",
    title: "Password-protect a code",
    summary: "Ask for a password before a scan reaches its destination.",
    doIt: [
      `In the Codes list, open the code's actions menu and choose "Access…."`,
      `Enter a password (4 to 128 characters) and press Save.`,
      `To change it later, open Access… again and enter a new one.`,
      `To remove it, open Access…, choose "Remove password," and Save.`,
    ],
    whatToExpect:
      "A scanner sees a plain password page and is only forwarded to the real destination once the password is confirmed on our server. The check happens entirely server-side: the password is never compared in the browser, and the destination never sits in the page's HTML until after a correct entry. Repeated wrong guesses against one code are rate-limited, so the password wall isn't just a formality. Access controls, including passwords, are a Pro feature, and they combine with an expiry if you set both: a code that is both expired and protected shows the same neutral gone page an expired code always shows, never the password prompt, so it never invites a guess at something that isn't coming back.",
    crossLinks: [
      { label: "Set or clear an expiry", href: "/help/set-or-clear-an-expiry" },
    ],
  },
  {
    slug: "set-or-clear-an-expiry",
    category: "Access",
    title: "Set or clear an expiry",
    summary: "Give a code a date it stops resolving to its destination, or bring one back.",
    doIt: [
      `In the Codes list, open the code's actions menu and choose "Access…."`,
      "Pick a date and time in the Expires field (entered in your own local time) and Save.",
      `To revive an expired code, open Access… again, clear the Expires field (or push it into the future), and Save.`,
      `Over the API instead: PATCH /api/v1/codes/{slug} with {"expiresAt": "2026-12-31T23:59:00Z"}, or {"expiresAt": null} to clear it.`,
    ],
    whatToExpect:
      "Once the expiry passes, scans land on the same neutral page a paused code shows, never an error. Expiry outranks password protection in that decision, so an expired, password-protected code always reads as gone rather than inviting a guess at a password for something that isn't coming back. Clearing the expiry, or moving it forward, picks the code back up exactly where it left off, including any password that was already set: nothing about the code is deleted when it expires, only its willingness to forward a scan. A date in the past is accepted too, which is a legitimate way to kill a code immediately if you need to. Expiry is a Pro feature.",
    crossLinks: [
      { label: "Password-protect a code", href: "/help/password-protect-a-code" },
      { label: "Pause and resume a code", href: "/help/pause-and-resume-a-code" },
    ],
  },
  {
    slug: "claim-a-vanity-slug",
    category: "Access",
    title: "Claim a vanity slug",
    summary: "Pick your own short link instead of a random one.",
    doIt: [
      `While creating a code, expand "Customize link" beneath the name field.`,
      "Type the slug you want and finish creating the code as usual.",
    ],
    whatToExpect: `Vanity slugs are a Pro feature: 4 to 30 characters, drawn from ${SLUG_CHARSET} (no 0, 1, I, L, O, or U, since those are the characters most often misread on a printed label or a low-resolution photo). Lowercase is fine to type; it gets normalized to uppercase automatically, since that is the printable form every QRCDN short link actually takes. A taken slug fails immediately with a clear "that link is taken" message and no silent retry onto a different one, so you always know to try again with something else rather than wondering which slug actually landed. A handful of words tied to the product itself, like the ones already used in the app's own routes, are permanently off-limits no matter how the rest of the charset check goes.`,
    crossLinks: [{ label: "Create your first dynamic code", href: "/help/create-a-dynamic-code" }],
  },
  {
    slug: "bulk-create-codes",
    category: "Access",
    title: "Bulk-create codes",
    summary: "Mint a batch of dynamic codes from a pasted list of destinations.",
    doIt: [
      `In the Studio rail, choose "Bulk create," beside "Create dynamic code."`,
      `Paste one destination per line, optionally as Name | https://example.com to set your own names.`,
      `Press Create. Up to 50 codes per batch, capped by however many codes your plan has left.`,
    ],
    whatToExpect:
      "Bulk creation is a Pro feature, and it succeeds partially rather than all-or-nothing: one bad line, a malformed URL or a vanity slug someone else already has, fails on its own without stopping the rest of the batch. Every line shares whatever style is currently on stage in the studio, so set the look you want before pasting. The results list shows exactly what was created and what wasn't, with a reason for each failure, and can be exported afterward as a CSV with the new short link beside every successful row, ready to paste into a spreadsheet or hand off to whoever is doing the printing.",
    crossLinks: [{ label: "Create your first dynamic code", href: "/help/create-a-dynamic-code" }],
  },
  {
    slug: "what-happens-when-you-downgrade",
    category: "Billing & plans",
    title: "What happens when I downgrade",
    summary: "The policy that protects your printed codes if your plan ever changes.",
    doIt: [
      "Nothing, today: paid checkout has not opened yet, so there is no self-serve downgrade to walk through in the product right now. Everyone is on the free plan until billing goes live, and the pricing page says so plainly rather than hiding a Stripe form that doesn't exist behind an upgrade button.",
    ],
    whatToExpect: `Once billing exists, the policy is unconditional and it is worth knowing in advance: free codes are never deactivated, on any plan history, and a downgrade never breaks a printed code. If a plan change ever puts you over the free plan's ${PLAN_LIMITS.free.dynamicCodes}-code limit, codes beyond that count become read-only rather than deleted; you cannot edit them further, but every code, over the limit or not, keeps redirecting exactly where it already pointed. Scans, retargets already in place, and analytics keep working the same as before. This is written into the terms as a real commitment, not just phrased gently on this page.`,
    crossLinks: [{ label: "Pricing", href: "/pricing" }],
  },
  {
    slug: "export-formats-and-print-quality",
    category: "Codes",
    title: "Export formats and print quality",
    summary: "Choosing between SVG and PNG, and printing a code that actually scans.",
    doIt: [
      "In the Studio rail's Export section, choose Download SVG or Download PNG.",
      "For PNG, pick a pixel size first: 512, 1024, 2048, or 4096 px per side.",
      "Check the scannability reading beside the live preview before downloading; it reflects exactly the style you are about to export, updated as you edit.",
    ],
    whatToExpect:
      "SVG is a vector file: it scales to any print size with no loss of quality, and it is the right choice for a print shop, a large banner, or anything getting resized by someone else downstream. PNG is a fixed-pixel raster, better for a screen or a quick print at a known size; pick a size at least as large as the final print will be, never smaller, since scaling a PNG up afterward only blurs it. As a rule of thumb for print, keep each module at or above roughly a third of a millimeter, and treat anything printed smaller than about 2 by 2 centimeters as risky at ordinary phone-camera range. The scannability warning, if you have one, is worth resolving before you export rather than after a print run comes back.",
    crossLinks: [{ label: "Create your first dynamic code", href: "/help/create-a-dynamic-code" }],
  },
  {
    slug: "delete-your-account-and-your-data",
    category: "Account",
    title: "Delete your account and your data",
    summary: "The honest, current path to a full account deletion.",
    doIt: [
      "Email hello@qrcdn.com from the address on your account and ask for it to be deleted.",
      "We verify it's really you, then delete the account by hand. Self-serve deletion isn't in the product yet, so this is the real path today, not a placeholder for one.",
      "If you want to keep a record of what you made first, note down your codes and their destinations before asking: nothing survives the deletion.",
    ],
    whatToExpect:
      "Deletion is immediate and cascades once it happens: every code, brand kit, and API key you own, along with their scan history, is permanently removed at the database level, the same guarantee written into the privacy policy. There is no partial deletion offered on your behalf and no way to undo it once it runs. Any of your codes still printed somewhere, on a mug, a menu, a sign, stop resolving to your destinations and behave like any other unclaimed slug from that point on: a scan lands on a neutral page rather than an error, but it no longer reaches wherever you had pointed it.",
    crossLinks: [{ label: "Privacy policy", href: "/privacy" }],
  },
] as const;

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}

export function helpArticlesByCategory(): readonly (readonly [HelpCategory, HelpArticle[]])[] {
  return HELP_CATEGORIES.map(
    (category) =>
      [category, HELP_ARTICLES.filter((article) => article.category === category)] as const,
  );
}
