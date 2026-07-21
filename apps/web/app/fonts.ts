import {
  Bricolage_Grotesque,
  Fraunces,
  Hanken_Grotesk,
  Inter,
  JetBrains_Mono,
  Space_Grotesk,
} from "next/font/google";

// All fonts loaded during the P2 brand exploration. After checkpoint A the
// winning direction's fonts stay and the rest are deleted (D13).

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const fontVariables = [
  inter.variable,
  jetbrainsMono.variable,
  spaceGrotesk.variable,
  fraunces.variable,
  hankenGrotesk.variable,
  bricolage.variable,
].join(" ");
