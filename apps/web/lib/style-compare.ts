// Deep style comparison for the Studio's "unsaved changes" indicator
// (P4-U3, kit bar). Pure and colocated-tested (style-compare.test.ts).

/** Recursively sorts object keys so two structurally-identical values
 *  produce identical JSON regardless of property insertion order (a
 *  hand-built style object and a zod-parsed one won't always share key
 *  order even when every value matches). */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    const out: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      out[key] = canonicalize(val);
    }
    return out;
  }
  return value;
}

/** Structural deep-equality, independent of key order. Used to decide
 *  whether the Studio's working style differs from a kit's saved style. */
export function stylesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
}
