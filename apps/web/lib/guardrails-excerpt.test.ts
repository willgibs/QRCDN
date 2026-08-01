import { describe, expect, it } from "vitest";
import { readGuardrailsExcerpt } from "./guardrails-excerpt";

/**
 * Proves the build-time source excerpt (section 09, "Built in the open")
 * actually reads the real packages/qr-engine/src/guardrails.ts off disk —
 * not a hand-typed copy that could drift. `server-only` is aliased to a
 * no-op stub under vitest (vitest.config.ts), same as highlight.test.ts.
 */
describe("readGuardrailsExcerpt", () => {
  it("includes the real, currently-exported threshold constants verbatim", () => {
    const excerpt = readGuardrailsExcerpt();
    expect(excerpt).toContain("export const LOGO_EFFECTIVE_WARN = 0.395;");
    expect(excerpt).toContain("export const LOGO_EFFECTIVE_ERROR = 0.412;");
    expect(excerpt).toContain("export const CONTRAST_ERROR_MIN = 3;");
    expect(excerpt).toContain("export const CONTRAST_WARN_MIN = 4;");
  });

  it("excludes code outside the threshold-constants block", () => {
    const excerpt = readGuardrailsExcerpt();
    // LOGO_RATIO_ECC_Q_OK sits between the two exported const pairs and
    // stays unexported — confirms the excerpt is a real slice of the file,
    // not a hand-typed approximation that happens to contain the right
    // substrings.
    expect(excerpt).toContain("LOGO_RATIO_ECC_Q_OK");
    // Anything below the END_MARKER (the rest of the file's logic) must not
    // leak into what visitors see as "the threshold constants."
    expect(excerpt).not.toContain("export function scannabilityReport");
    expect(excerpt).not.toContain("modulesForVersion");
  });
});
