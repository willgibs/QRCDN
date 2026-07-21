import { Inter, JetBrains_Mono } from "next/font/google";

// Locked system fonts (D13, checkpoint A): Inter for display + body
// (SF Pro analog at tight display tracking), JetBrains Mono for technical
// accents — URLs, slugs, eyebrows, API copy.

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

export const fontVariables = [inter.variable, jetbrainsMono.variable].join(" ");
