import { Lexend } from "next/font/google";

// Lexend, loaded via next/font (self-hosted at build, zero layout shift, no
// render-blocking @import). Variable font — the full 100–900 weight range is
// available through the one --font-lexend variable, so no per-weight entries.
export const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});
