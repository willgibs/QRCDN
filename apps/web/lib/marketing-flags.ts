// Landing "doorway" links into the /features/* pages. Originally one shared
// flag (P9.5-T3a) under the premise that every /features/* page would land
// in a single T-F unit together. That premise didn't hold: T-F is chunked
// (docs/guides/p9.5-ascent.md), and chunk 1 ships /features/dynamic-codes +
// /features/analytics while /features/brand-studio remains unbuilt — so a
// single boolean would either 404 the brand-studio doorway (if flipped on
// for all three) or wrongly hide the two real pages that just shipped (if
// left off). Split into one flag per doorway instead, each independently
// flippable the moment its destination page is real. SiteNav/SiteFooter's
// standing "real hrefs only" rule (no href="#" or dead-page placeholders on
// a public page, docs/guides/p9-marketing.md) is why an unbuilt page's
// doorway must stay unrendered rather than link out to a 404. Doorways that
// already point at a real page today (API's "Read the docs" -> /developers,
// pricing's "Compare everything" -> /pricing) were never gated by this file.
export const DYNAMIC_CODES_DOORWAY_ENABLED = true;
export const ANALYTICS_DOORWAY_ENABLED = true;
export const BRAND_STUDIO_DOORWAY_ENABLED = false;
