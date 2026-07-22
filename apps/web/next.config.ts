import type { NextConfig } from "next";

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

export default nextConfig;
