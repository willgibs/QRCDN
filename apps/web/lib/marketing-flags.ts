// Landing "doorway" links into the future per-feature pages
// (/features/brand-studio, /features/dynamic-codes, /features/analytics)
// don't exist yet — they land at T-F (docs/guides/p9.5-ascent.md's
// sequence). SiteNav/SiteFooter's standing "real hrefs only" rule (no
// href="#" or dead-page placeholders on a public page, docs/guides/
// p9-marketing.md) means every section's doorway into /features/* must
// stay unrendered until its destination is real, rather than link out to a
// 404. One flag, not one per section: every /features/* doorway lands in
// the same T-F unit, so they flip on together. Doorways that already point
// at a real page today (API's "Read the docs" -> /developers, pricing's
// "Compare everything" -> /pricing) are NOT gated by this — only the new
// /features/* ones are.
export const FEATURE_DOORWAYS_ENABLED = false;
