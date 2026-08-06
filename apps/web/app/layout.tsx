import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qrcdn.com"),
  title: {
    default: "QRCDN: QR codes with a brand system",
    template: "%s · QRCDN",
  },
  description:
    "Set your brand's QR identity once. Every code inherits it: static or dynamic, hosted fast globally, retargetable forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The `dark` class is STATIC (P9.9-C0.6, board directive 2026-08-06):
  // the entire product renders one dark register — marketing and app alike
  // — so the studio preview is exactly what every surface ships. next-themes
  // (and the toggle, and C0.5's forced-dark wrapper machinery) are gone;
  // globals.css pairs this with `html { color-scheme: dark }`. The light
  // :root token block remains the base layer for future hard-coded
  // "reversed" light sections (design-system.md's paper plate), which
  // re-scope tokens locally and are never a user preference.
  return (
    <html lang="en" className={`${fontVariables} dark h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
