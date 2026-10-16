import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

// Inter Tight, self-hosted via next/font (no render-blocking Google @import).
// One variable family for body and headings; weight carries the hierarchy.
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });

export const metadata: Metadata = {
  title: "Gloceries Partner Dashboard",
  description: "Manage your store's orders, inventory, and payouts on Gloceries.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browser extensions (password managers,
    // security and colour-picker add-ons) write attributes onto <html>/<body>
    // before React hydrates. Only these two elements' own attributes are
    // exempt; mismatches anywhere inside still warn.
    <html lang="en" className={`h-full antialiased ${interTight.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
