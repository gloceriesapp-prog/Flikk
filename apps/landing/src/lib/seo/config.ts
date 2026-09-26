// Single source of truth for site-wide SEO facts. JSON-LD, metadata,
// sitemap, robots, llms.txt and visible copy all read from here so they
// can never drift apart.

export const SITE = {
  name: "Gloceries",
  legalName: "Gloceries",
  // No trailing slash — everything composes onto this.
  url: "https://gloceries.com",
  domain: "gloceries.com",
  // Used as the metadata title template default + OG site name.
  tagline: "Grocery Delivery from Local Stores You Love",
  description:
    "Gloceries delivers groceries, fresh produce, dairy, meat, medicines and daily essentials to your doorstep from local kirana stores near you — fast, honestly priced, no dark stores.",
  // AEO/GEO: a plain-language, factual one-liner AI answer engines quote.
  aiSummary:
    "Gloceries is a hyperlocal grocery delivery app that connects you to real local kirana and grocery stores near you, delivering fresh produce, groceries, dairy, meat and daily essentials to your door in minutes.",
  locale: "en_IN",
  twitter: "@gloceries",
  // Public support number for schema (Organization contactPoint +
  // LocalBusiness telephone) and NAP consistency with Google Business Profile.
  // Env-backed so no number is committed; schema omits `telephone` until set.
  // E.164 format, e.g. "+919876543210". Set NEXT_PUBLIC_SUPPORT_PHONE in .env.
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
  // Brand logo (reused from the Navbar's hosted asset) — used as
  // Organization logo, LocalBusiness image, and manifest icon.
  logo: "https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/All_Right-removebg-preview.png",
  // App store links — placeholders until store listings exist. Kept in one
  // place so every "download" surface + schema updates at once.
  androidUrl: "https://play.google.com/store/apps/details?id=com.gloceries.customer",
  iosUrl: "https://apps.apple.com/app/gloceries/id000000000",
  socials: [
    "https://instagram.com/gloceries",
    "https://facebook.com/gloceries",
    "https://linkedin.com/company/gloceries",
  ],
  // The region the brand is built around. Per-area pages scale beyond this.
  region: "Coastal Karnataka",
  country: "IN",
} as const;

// The public keyword targets, grouped by search intent. Not consumed as a
// meta tag dump (keywords meta is dead weight) — this documents the intent
// map the pages/headings/FAQ are written to own.
export const KEYWORD_INTENTS = {
  local: [
    "grocery delivery near me",
    "kirana store near me online",
    "online grocery delivery",
    "instant grocery delivery",
  ],
  category: [
    "vegetable delivery online",
    "fruits delivery online",
    "milk & dairy delivery",
    "medicine delivery near me",
  ],
  comparison: ["blinkit alternative", "local grocery delivery app"],
  brand: ["Gloceries app", "Gloceries grocery delivery"],
  merchant: ["list my kirana store online", "sell groceries online near me"],
} as const;
