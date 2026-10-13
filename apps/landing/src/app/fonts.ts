import { Inter_Tight } from "next/font/google";

// One variable family for all landing routes. Next.js self-hosts the font;
// weights 100–900 and real italics are available without browser CSS imports.
export const interTight = Inter_Tight({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-inter-tight",
  display: "swap",
});
