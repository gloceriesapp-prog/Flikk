// JSON-LD builders. Every schema object is produced here from the SITE /
// AREAS / FAQ single sources, then rendered by <JsonLd>. Keeping the shapes
// in one file means visible copy and structured data never drift.

import type { Area } from "./areas";
import type { Faq } from "./faqs";
import { SITE } from "./config";

type Json = Record<string, unknown>;

const abs = (path = "") => `${SITE.url}${path}`;

// Site-wide — rendered in the root layout.
export const organizationSchema = (): Json => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": abs("/#organization"),
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  logo: SITE.logo,
  description: SITE.description,
  sameAs: SITE.socials,
  areaServed: SITE.region,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    areaServed: SITE.country,
    availableLanguage: ["en", "kn", "hi"],
  },
});

export const websiteSchema = (): Json => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": abs("/#website"),
  url: SITE.url,
  name: SITE.name,
  description: SITE.description,
  publisher: { "@id": abs("/#organization") },
  // No SearchAction/sitelinks searchbox: this marketing site has no /search
  // route (search lives in the app). Declaring one points Google's searchbox
  // at a 404 — add it back only when a real /search page exists.
});

// The customer app — rendered on the home page.
export const mobileAppSchema = (): Json => ({
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: `${SITE.name} — ${SITE.tagline}`,
  operatingSystem: "ANDROID, IOS",
  applicationCategory: "ShoppingApplication",
  description: SITE.aiSummary,
  url: SITE.url,
  downloadUrl: [SITE.androidUrl, SITE.iosUrl],
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  publisher: { "@id": abs("/#organization") },
});

// Per-area — rendered on /delivery/<slug>.
export const localBusinessSchema = (area: Area): Json => ({
  "@context": "https://schema.org",
  "@type": "GroceryStore",
  "@id": abs(`/delivery/${area.slug}#business`),
  name: `${SITE.name} — Grocery Delivery in ${area.area}`,
  image: SITE.logo,
  url: abs(`/delivery/${area.slug}`),
  description: `Grocery, fresh produce, dairy and daily essentials delivery from local stores in ${area.area}, ${area.city}.`,
  parentOrganization: { "@id": abs("/#organization") },
  priceRange: "₹₹",
  areaServed: {
    "@type": "City",
    name: area.city,
    containedInPlace: { "@type": "State", name: area.state },
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: area.area,
    addressRegion: area.state,
    addressCountry: SITE.country,
  },
  geo: { "@type": "GeoCoordinates", latitude: area.lat, longitude: area.lng },
});

export const faqSchema = (faqs: Faq[]): Json => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const breadcrumbSchema = (
  crumbs: { name: string; path: string }[],
): Json => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: abs(c.path),
  })),
});
