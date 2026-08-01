import type { ProbeAttempt } from "./evaluate";

// The one I/O shell in this package — everything that decides pass/fail
// lives in evaluate.ts and takes plain data, per the same split
// workers/redirect uses. Deliberately untested directly (it does a real
// network fetch); evaluate.ts is what's unit-tested, against constructed
// ProbeAttempt values.

const CAPTURED_HEADERS = ["cache-control"];

/**
 * Runs one GET against `url` with a hard timeout and never throws: a
 * network failure or a timeout both become a `ProbeAttempt` with `error`
 * set and no `response`, the same shape evaluate.ts already handles for a
 * real non-2xx response.
 *
 * `redirect: "manual"` is required, not incidental — this Worker exists to
 * inspect the raw edge response (status, headers) a probe target returns.
 * Letting `fetch` transparently follow the apex probe's 302 would replace
 * the very response P1 needs to see with whatever the `/u/{slug}` page
 * returns instead.
 */
export async function runProbe(url: string, init: RequestInit, timeoutMs: number): Promise<ProbeAttempt> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, redirect: "manual", signal: controller.signal });
    const headers: Record<string, string> = {};
    for (const name of CAPTURED_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    return { latencyMs: Date.now() - start, response: { status: response.status, headers } };
  } catch (err) {
    return { latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
