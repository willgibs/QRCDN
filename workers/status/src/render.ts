import type { OverallStatus, ProbeResult } from "./evaluate";

// Self-contained HTML: no external stylesheet, no font loader, no client
// JS, no dependency on apps/web (this Worker must run on infrastructure
// fully independent of the product it's watching). Every color below is a
// literal value, hand-copied from apps/web/app/globals.css's DARK-mode
// block rather than imported — deliberately: this Worker and apps/web never
// share a build, so "mirroring the aesthetic" can only mean matching the
// values, not the source. Always rendered in the dark palette regardless of
// visitor preference (no prefers-color-scheme handling): this is a small,
// fixed-register infra page, not a themed product surface.
const COLORS = {
  background: "oklch(0.13 0.004 280)",
  foreground: "oklch(0.96 0.002 280)",
  card: "oklch(0.17 0.005 280)",
  primary: "oklch(0.62 0.21 268)",
  mutedForeground: "oklch(0.62 0.006 280)",
  border: "oklch(1 0 0 / 9%)",
  // Same "healthy" dot color apps/web's own ScannabilityChip uses for its
  // clean state (Tailwind's emerald-500) — the one place this product
  // already has a pass/fail instrument-dot convention to match.
  pass: "oklch(69.6% 0.17 162.48)",
  // apps/web's dark-mode --destructive.
  fail: "oklch(0.704 0.191 22.216)",
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function probeRow(result: ProbeResult): string {
  const dotColor = result.status === "pass" ? "var(--pass)" : "var(--fail)";
  const statusWord = result.status === "pass" ? "Pass" : "Fail";
  return `      <li class="probe-row" data-status="${result.status}">
        <div class="probe-row__label">
          <span class="dot" style="background:${dotColor}" aria-hidden="true"></span>
          <span>${escapeHtml(result.label)}</span>
        </div>
        <div class="probe-row__meta">
          <span class="probe-row__status">${statusWord}</span>
          <span class="probe-row__latency">${result.latencyMs}ms</span>
        </div>
        <p class="probe-row__detail">${escapeHtml(result.detail)}</p>
      </li>`;
}

/**
 * Renders the entire status page as one self-contained HTML document. Pure
 * function of its three inputs — no fetch, no Date.now() called internally
 * (the caller supplies `checkedAt`) — so it's exercised directly in
 * test/render.test.ts with constructed ProbeResults, the same "pure core,
 * thin shell" split evaluate.ts/probe.ts already establish.
 *
 * No uptime bars, no history, no storage: the three rows below are the
 * entire page, by design (T6 spec) — this is a live check of right now,
 * not a monitoring dashboard.
 */
export function renderStatusPage(
  results: readonly ProbeResult[],
  overall: OverallStatus,
  checkedAt: Date,
): string {
  const overallWord = overall === "ok" ? "All systems normal" : "Needs attention";
  const overallColor = overall === "ok" ? "var(--pass)" : "var(--fail)";
  const checkedAtIso = checkedAt.toISOString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Status &middot; QRCDN</title>
<meta name="robots" content="noindex" />
<style>
  :root {
    --background: ${COLORS.background};
    --foreground: ${COLORS.foreground};
    --card: ${COLORS.card};
    --primary: ${COLORS.primary};
    --muted-foreground: ${COLORS.mutedForeground};
    --border: ${COLORS.border};
    --pass: ${COLORS.pass};
    --fail: ${COLORS.fail};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: var(--background);
    color: var(--foreground);
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    display: flex;
    justify-content: center;
    padding: 4rem 1.5rem;
  }
  main { width: 100%; max-width: 36rem; }
  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .wordmark strong { color: var(--foreground); }
  h1 {
    margin: 1.25rem 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--overall-color, var(--foreground));
  }
  .subtitle {
    margin: 0 0 2.5rem;
    color: var(--muted-foreground);
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  .subtitle time { color: var(--foreground); }
  ul.probes {
    list-style: none;
    margin: 0 0 2rem;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 1rem;
    overflow: hidden;
    background: var(--card);
  }
  .probe-row {
    padding: 1.125rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .probe-row:last-child { border-bottom: none; }
  .probe-row__label {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-weight: 500;
  }
  .dot {
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .probe-row__meta {
    display: flex;
    justify-content: space-between;
    margin-top: 0.375rem;
    font-family: ui-monospace, "JetBrains Mono", monospace;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
  .probe-row__status { text-transform: uppercase; letter-spacing: 0.1em; }
  .probe-row__detail {
    margin: 0.625rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--muted-foreground);
  }
  footer {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-family: ui-monospace, "JetBrains Mono", monospace;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
  footer a { color: var(--primary); text-decoration: none; }
  footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main>
    <div class="wordmark"><strong>QRCDN</strong><span>Status</span></div>
    <h1 style="--overall-color:${overallColor}">${overallWord}</h1>
    <p class="subtitle">
      Checked just now, live from the edge, at <time datetime="${checkedAtIso}">${checkedAtIso}</time>.
      This page runs on separate infrastructure from the product: an independent Cloudflare
      Worker with no code path shared with qrcdn.com's redirects or www.qrcdn.com's app.
    </p>
    <ul class="probes">
${results.map(probeRow).join("\n")}
    </ul>
    <footer>
      <span>No history. No uptime bars. Just three checks, run when you loaded this page.</span>
      <a href="https://www.qrcdn.com">www.qrcdn.com &rarr;</a>
    </footer>
  </main>
</body>
</html>
`;
}
