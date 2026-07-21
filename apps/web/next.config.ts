import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@qrcdn/qr-engine", "@qrcdn/shared"],
};

export default nextConfig;
