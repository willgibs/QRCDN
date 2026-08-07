// Landing "doorway" links into the /features/* pages. Originally one shared
// flag (P9.5-T3a) under the premise that every /features/* page would land
// in a single T-F unit together. That premise didn't hold: T-F is chunked
// (docs/guides/p9.5-ascent.md), and chunk 1 shipped /features/dynamic-codes +
// /features/analytics while /features/brand-studio and /features/access-
// controls remained unbuilt — so a single boolean would either 404 the
// not-yet-real doorways (if flipped on for all four) or wrongly hide the
// pages that had already shipped (if left off). Split into one flag per
// doorway instead, each independently flippable the moment its destination
// page is real. SiteNav/SiteFooter's standing "real hrefs only" rule (no
// href="#" or dead-page placeholders on a public page,
// docs/guides/p9-marketing.md) is why an unbuilt page's doorway must stay
// unrendered rather than link out to a 404. Doorways that already point at a
// real page today (API's "Read the docs" -> /developers, pricing's "Compare
// everything" -> /pricing) were never gated by this file.
//
// P9.5-T-F2: /features/brand-studio and /features/access-controls both
// shipped this unit, so BRAND_STUDIO_DOORWAY_ENABLED flips true and a new
// ACCESS_CONTROLS_DOORWAY_ENABLED lands true for the one natural slot the
// spec found (dynamic-codes-section.tsx, beside the existing dynamic-codes
// doorway — that section's own state-cards already depict the password
// gate and the expired-code row this new page expands on).
//
// P9.9-C2: BRAND_STUDIO_DOORWAY_ENABLED is down to ONE call site,
// brand-system-section.tsx (section 04). The playground's copy retired
// with its landing branch: the restaged section 03 closes on the /studio
// CTA instead (studio-section.tsx), which is a product page, not a
// feature-depth page, and was never gated by this file.
export const DYNAMIC_CODES_DOORWAY_ENABLED = true;
export const ANALYTICS_DOORWAY_ENABLED = true;
export const BRAND_STUDIO_DOORWAY_ENABLED = true;
export const ACCESS_CONTROLS_DOORWAY_ENABLED = true;
