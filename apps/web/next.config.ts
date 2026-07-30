import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@qrcdn/qr-engine", "@qrcdn/shared"],
  experimental: {
    serverActions: {
      // P4-U4 red-team finding: the Studio embeds an uploaded logo directly
      // as a base64 data URI in `style.logo.assetId` (docs/guides/p4-studio.md
      // "Logo storage"). apps/web/lib/logo.ts's own MAX_LOGO_BYTES (2MB)
      // base64-inflates to ~2.7MB of request body before the framework's
      // default 1MB serverActions.bodySizeLimit is reached — meaning any
      // logo upload past ~730KB (well under the documented 2MB cap) was
      // silently rejected by Next.js itself before createBrandKit/
      // updateBrandKit ever ran. Raised with headroom above
      // MAX_LOGO_ASSET_ID_LENGTH (apps/web/lib/logo.ts); the app-level guard
      // in apps/web/lib/validation.ts still caps assetId length independent
      // of this transport-level limit.
      bodySizeLimit: "4mb",
    },
  },
};

// The Sentry Next.js build plugin is NOT a no-op by default: empirically
// verified (2026-07-30, `pnpm --filter web build` with zero Sentry env
// vars) that wrapping unconditionally prints multiple "ACTION REQUIRED" /
// "No auth token provided" warnings to the build log AND places a
// telemetry call to Sentry's own collection endpoint during
// `runAfterProductionCompile` — none of which is acceptable for a unit
// whose entire acceptance bar is "zero behavior change while unconfigured"
// (no Sentry account/org/project exists yet). Rather than rely on
// `silent`/`telemetry`/`sourcemaps.disable` options to individually
// suppress each symptom (fragile against future SDK versions, and doesn't
// rule out other build-graph changes the plugin makes), the wrap itself is
// gated on the same DSN check every runtime init uses — with no DSN, this
// file exports the plain `nextConfig` untouched, byte-for-byte the same
// build as before this file existed. Source-map upload also deliberately
// stays unconfigured either way (needs a separate SENTRY_AUTH_TOKEN org
// auth token — see apps/web/.env.example).
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      telemetry: false,
      sourcemaps: { disable: true },
    })
  : nextConfig;
