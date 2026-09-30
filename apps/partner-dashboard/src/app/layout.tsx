import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no render-blocking Google @import) — CLAUDE.md's
// system-font-only rule is deliberately overridden for THIS app only
// (partner-dashboard, an internal web surface). Inter = body, IBM Plex = display.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gloceries Partner Dashboard",
  description: "Manage your store's orders, inventory, and payouts on Gloceries.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${ibmPlex.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
