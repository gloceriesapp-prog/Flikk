import type { Metadata } from "next";
import { lexend } from "./fonts";
import "./globals.css";
import SmoothScroll from "@/components/providers/SmoothScroll";
import JsonLd from "@/components/seo/JsonLd";
import { SITE } from "@/lib/seo/config";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "grocery delivery near me",
    "online grocery delivery",
    "kirana store near me",
    "instant grocery delivery",
    "vegetable delivery online",
    "milk delivery",
    "medicine delivery near me",
    "local grocery delivery app",
    "Blinkit alternative",
    "Gloceries",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  publisher: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/favicon.ico", apple: "/favicon.ico" },
  manifest: "/manifest.webmanifest",
  verification: {
    // IDs live in env, never committed (see .env.example). Undefined =
    // simply omitted from the head, so this is safe before they exist.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="font-sans antialiased bg-white text-slate-900">
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
