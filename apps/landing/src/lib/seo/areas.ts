// Typed area list that drives per-area landing pages, their metadata,
// LocalBusiness JSON-LD, and sitemap entries. Adding a zone later = one
// entry here → a new page + schema + sitemap row appear automatically.
//
// `active: true`  = delivery is live now (honest "order now" framing).
// `active: false` = ranks the search intent, but the page says
//                   "launching soon / get notified" — never overclaims.

export type Area = {
  slug: string; // URL segment: /delivery/<slug>
  area: string; // Locality / town name shown in copy + H1
  city: string;
  state: string;
  lat: number;
  lng: number;
  active: boolean;
};

// ponytail: static list. Swap for a Supabase `zones` fetch in
// generateStaticParams once zones are managed in-DB (CLAUDE.md notes zones
// already exist as a DB concept) — the page/schema code needn't change.
export const AREAS: Area[] = [
  { slug: "mangalore", area: "Mangalore", city: "Mangalore", state: "Karnataka", lat: 12.9141, lng: 74.856, active: true },
  { slug: "kaup", area: "Kaup", city: "Udupi", state: "Karnataka", lat: 13.2167, lng: 74.75, active: true },
  { slug: "udupi", area: "Udupi", city: "Udupi", state: "Karnataka", lat: 13.3409, lng: 74.7421, active: false },
  { slug: "manipal", area: "Manipal", city: "Udupi", state: "Karnataka", lat: 13.3525, lng: 74.7868, active: false },
  { slug: "surathkal", area: "Surathkal", city: "Mangalore", state: "Karnataka", lat: 13.0068, lng: 74.7943, active: false },
  { slug: "kundapura", area: "Kundapura", city: "Udupi", state: "Karnataka", lat: 13.6257, lng: 74.6918, active: false },
  { slug: "mulki", area: "Mulki", city: "Mangalore", state: "Karnataka", lat: 13.09, lng: 74.7917, active: false },
  { slug: "bantwal", area: "Bantwal", city: "Dakshina Kannada", state: "Karnataka", lat: 12.8905, lng: 75.035, active: false },
  { slug: "puttur", area: "Puttur", city: "Dakshina Kannada", state: "Karnataka", lat: 12.7597, lng: 75.2, active: false },
  { slug: "karkala", area: "Karkala", city: "Udupi", state: "Karnataka", lat: 13.2116, lng: 74.9938, active: false },
];

export const getArea = (slug: string): Area | undefined =>
  AREAS.find((a) => a.slug === slug);
