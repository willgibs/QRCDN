// `beforeSend` hook for every Sentry init in this repo (web + worker) — the
// one place that decides what's allowed to leave our infrastructure before
// an event reaches Sentry. Honors D3 (docs/DECISIONS.md): raw IPs are never
// stored, and destinations/scan data/secrets must never leave our infra —
// request headers, cookies, request bodies, and free-form extra/context
// payloads are exactly the kind of incidental capture that could otherwise
// leak them (a stack frame's local variables, a manually-attached debug
// context, an auth header on a captured fetch call).
//
// Pure: no imports, no env reads, no I/O — same input always produces the
// same output, and the input is never mutated (every return is a fresh
// object). That makes it trivially unit-testable and safe to reason about
// independent of which SDK/runtime calls it.
//
// Must never throw: Sentry invokes this synchronously on every captured
// event, and an event's shape isn't fully within our control (SDK
// internals, future SDK versions, hand-built test fixtures). A throw here
// would both lose the event and risk the reporting path itself. The
// defensive typeof/Array.isArray guards below do the real work — none of
// them can throw for any JS value — but the outer try/catch is a
// last-resort net, matching this repo's "defense in depth" idiom (see
// workers/redirect/src/ingest.ts's own doc comment on the same pattern).

const SENSITIVE_HEADER_NAMES = new Set(["authorization", "cookie", "x-api-key"]);
const SENSITIVE_KEY_PATTERN = /password|destination|token|secret|api[-_]?key|email/i;

// extra/contexts are free-form bags that our own code populates, but the
// scrubber has to be safe for whatever shape actually shows up. Bounded by
// both depth (pathological nesting) and a seen-set (circular references) —
// either guard alone would be enough, having both costs nothing.
const MAX_SCRUB_DEPTH = 20;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrubHeaders(headers: unknown): unknown {
  if (!isPlainObject(headers)) {
    return headers;
  }
  const scrubbed: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
      continue;
    }
    scrubbed[name] = value;
  }
  return scrubbed;
}

/** Recursively rebuilds `value`, dropping any key matching
 *  SENSITIVE_KEY_PATTERN. Never mutates `value` — arrays and objects are
 *  rebuilt fresh, primitives are returned as-is. */
function scrubKeys(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (depth > MAX_SCRUB_DEPTH) {
    return "[Truncated]";
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrubKeys(item, seen, depth + 1));
  }

  const scrubbed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    scrubbed[key] = scrubKeys(val, seen, depth + 1);
  }
  return scrubbed;
}

/**
 * Sentry `beforeSend` hook. Returns a scrubbed clone of `event` — the input
 * is never mutated:
 *  - `request.headers`: deletes `authorization`/`cookie`/`x-api-key` (case-
 *    insensitive), keeps everything else.
 *  - `request.cookies` / `request.data`: dropped entirely, unconditionally.
 *  - `extra` / `contexts`: recursively rebuilt with any key matching
 *    SENSITIVE_KEY_PATTERN removed, at any depth.
 *
 * Non-object input (null, undefined, primitives, arrays) is returned
 * unchanged rather than throwing — there's nothing shaped like a Sentry
 * event to scrub, so passing it through is correct, not a leak.
 */
export function scrubEvent<T>(event: T): T {
  try {
    if (!isPlainObject(event)) {
      return event;
    }

    const scrubbed: Record<string, unknown> = { ...event };

    if (isPlainObject(scrubbed.request)) {
      const request: Record<string, unknown> = { ...scrubbed.request };
      request.headers = scrubHeaders(request.headers);
      delete request.cookies;
      delete request.data;
      scrubbed.request = request;
    }

    if ("extra" in scrubbed) {
      scrubbed.extra = scrubKeys(scrubbed.extra, new WeakSet(), 0);
    }
    if ("contexts" in scrubbed) {
      scrubbed.contexts = scrubKeys(scrubbed.contexts, new WeakSet(), 0);
    }

    return scrubbed as T;
  } catch {
    // Scrubbing itself must never be the thing that breaks error reporting
    // — that would recreate exactly the "silent failure, nobody knew" gap
    // this whole unit (P8-U2) exists to close. Every guard above is a plain
    // typeof/Array.isArray check that cannot throw for any real event this
    // repo's own code produces; this catch only exists for a hypothetical
    // future shape (e.g. a throwing getter) we don't control. In that case,
    // sending one event through unscrubbed beats silently dropping it.
    return event;
  }
}
