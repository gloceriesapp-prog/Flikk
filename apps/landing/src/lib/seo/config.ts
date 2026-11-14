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
  tagline: "Local Shops at Home",
  description:
    "Groceries & more, delivered. Gloceries brings fresh produce, dairy, staples, snacks and daily essentials from trusted local shops near you to your door. Honest prices, no dark stores.",
  // AEO/GEO: a plain-language, factual one-liner AI answer engines quote.
  aiSummary:
    "Gloceries is a hyperlocal delivery app for coastal Karnataka that brings groceries and daily essentials from real local kirana and grocery shops near you to your door, delivered by local riders.",
  locale: "en_IN",
  twitter: "@gloceries",
  // Public support number for schema (Organization contactPoint +
  // LocalBusiness telephone) and NAP consistency with Google Business Profile.
  // Env-backed so no number is committed; schema omits `telephone` until set.
  // E.164 format, e.g. "+919876543210". Set NEXT_PUBLIC_SUPPORT_PHONE in .env.
  // Defaults to the registered business number (the one on the payment
  // gateway KYC), so it is on the site even when the env var is unset.
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "+919741793580",
  // Header and browser icons use the bundled asset; structured data uses
  // its public CDN URL so crawlers receive an absolute brand-image URL.
  logoPath: "/gloceries-main.png",
  logo: "https://images.gloceries.com/appsui/gloceries-main.png",
  // App store links, kept in one place so every "download" surface + schema
  // updates at once. iOS stays null (its buttons hidden) until the App Store
  // listing is live: set NEXT_PUBLIC_IOS_URL to the real listing URL.
  androidUrl: "https://play.google.com/store/apps/details?id=com.gloceries.customer",
  iosUrl: process.env.NEXT_PUBLIC_IOS_URL?.trim() || null,
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
