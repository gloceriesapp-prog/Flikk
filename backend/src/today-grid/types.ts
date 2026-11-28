// Shared shapes for the "Today on Gloceries" grid. Everything the pure
// builder needs arrives as data: no database, no clock.

export type CardId =
  | 'milk-breakfast' | 'your-usuals' | 'popular-near-you' | 'breakfast-ready' | 'tea-coffee'
  | 'lunch-essentials' | 'offers-for-you' | 'taste-of-tulunadu' | 'glo-bulk' | 'namma-brands'
  | 'home-cleaning' | 'snack-time' | 'cold-drinks' | 'fish-meat' | 'tomorrow-by-7' | 'ice-cream'
  | 'late-night-snacks' | 'daily-needs' | 'daily-essentials' | 'party-orders' | 'festival-needs'
  | 'rainy-day';
export type HeroId = 'todays-catch' | 'village-fresh' | 'veg-for-tomorrow' | 'fresh-by-7' | 'fruits-vegetables';

// One product group's live, in-stock picture near the customer. Every number
// shown on a card is derived from this, never typed in.
export interface Stat {
  count: number;
  minPrice: number | null;
  // MRP of the cheapest item, only when real and above its price.
  minPriceMrp: number | null;
  // Best real discount (MRP > price), whole percent.
  maxDiscountPct: number | null;
  imageUrls: string[];
}
export const EMPTY_STAT: Stat = { count: 0, minPrice: null, minPriceMrp: null, maxDiscountPct: null, imageUrls: [] };

// Precomputed for the customer's nearby open shops (availability.ts).
export interface Availability {
  openStores: number;
  // In-stock products by product category name.
  categories: Record<string, Stat>;
  fish: Stat & { arrivedMinute: number | null }; // earliest arrival today, IST minute
  villagePickedToday: Stat;
  vegetables: Stat;
  fruitsAndVegetables: Stat;
  // Tomorrow's morning slot (existing pre-order cut-off rule).
  preorder: { open: boolean; cutoffMinute: number | null };
  bulk: Stat;
  party: Stat;
  popularThisWeek: Stat;
  brands: Stat; // in-stock Namma Brands cards
}

export interface UserSummary {
  kind: 'guest' | 'customer';
  deliveredOrders: number;
  // Items bought before that are in stock now.
  usuals: Stat;
  // Live real discounts in categories the customer bought before.
  offers: Stat;
  // The in-stock products behind usuals/offers (card tap lists).
  usualIds: string[];
  offerIds: string[];
}

export type CardTarget =
  | { type: 'categories'; categories: string[] }
  | { type: 'tab'; id: 'fresh' | 'preorder' | 'udupi' }
  | { type: 'usuals' } // add-all with a toast
  | { type: 'popular' } | { type: 'offers' } | { type: 'bulk' } | { type: 'brands' }
  | { type: 'form'; id: 'party' };

export type DataCheck =
  | { kind: 'categories'; min: number }
  | { kind: 'usuals' } | { kind: 'popular' } | { kind: 'offers' } | { kind: 'storeOpen' }
  | { kind: 'preorder' } | { kind: 'bulk' } | { kind: 'party' } | { kind: 'brands' };

export interface CardDef {
  id: CardId;
  title: string;
  // May hold {min} {pct} {total} {cutoff}; falls back to fallbackTag when a
  // number cannot be computed from live data.
  tag: string;
  fallbackTag: string;
  line: string;
  accent: string;
  tagText?: string;
  categories: string[]; // target list (used by 'categories' checks/targets)
  check: DataCheck;
  target: CardTarget;
}

export interface GridCard {
  id: CardId | HeroId;
  title: string;
  tag: string;
  line: string;
  accent: string;
  tagBg: string;
  tagText: string;
  imageUrls: string[];
  target: CardTarget;
  // Hero only, honest numbers: mrp only when real and above price.
  price?: { amount: number; mrp: number | null };
}

export interface TodayGrid { hero: GridCard; cards: GridCard[]; slot: string; refreshAt: string }
