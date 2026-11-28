// Shapes shared by the "Today on Gloceries" engine, the backend endpoint, the
// customer app and the admin. Source of truth: this folder (src/*.ts), compiled
// to the package's plain JS + .d.ts by `npm run build` (see package README).

export type HeroId = 'todays-catch' | 'village-fresh' | 'veg-for-tomorrow' | 'fresh-by-7' | 'fruits-vegetables';
export type CardId =
  | 'milk-breakfast' | 'your-usuals' | 'popular-near-you' | 'breakfast-ready' | 'tea-coffee'
  | 'lunch-essentials' | 'offers-for-you' | 'taste-of-tulunadu' | 'glo-bulk' | 'namma-brands'
  | 'home-cleaning' | 'snack-time' | 'cold-drinks' | 'fish-meat' | 'tomorrow-by-7' | 'ice-cream'
  | 'late-night-snacks' | 'daily-needs' | 'daily-essentials' | 'party-orders' | 'festival-needs'
  | 'rainy-day';
export type ItemId = HeroId | CardId;
export type ItemType = 'hero' | 'rotating' | 'special';
export type Placeholder = 'min' | 'pct' | 'total' | 'time' | 'cutoff' | 'festival';

// ---- live data (computed by the backend from the database) -------------
export interface Stat {
  count: number;
  minPrice: number | null;
  minPriceMrp: number | null; // only when real and above minPrice
  maxDiscountPct: number | null; // best real discount, whole percent
  imageUrls: string[];
}
export const EMPTY_STAT: Stat = { count: 0, minPrice: null, minPriceMrp: null, maxDiscountPct: null, imageUrls: [] };

export interface LocalBrands { count: number; logoUrls: string[]; brandIds: string[] }

export interface Availability {
  openStores: number;
  categories: Record<string, Stat>; // in-stock products by category name
  fish: Stat & { arrivedMinute: number | null }; // today's catch, earliest arrival (IST minute)
  villagePickedToday: Stat;
  vegetables: Stat;
  fruitsAndVegetables: Stat;
  preorder: { open: boolean; cutoffMinute: number | null };
  bulk: Stat;
  party: Stat;
  popularThisWeek: Stat;
  localBrands: LocalBrands; // local brands with 1+ in-stock product nearby
  productImages: Record<string, string>; // in-stock product id -> photo (picked card images)
}

export interface UserSummary {
  kind: 'guest' | 'customer';
  deliveredOrders: number;
  usuals: Stat;
  offers: Stat;
  usualIds: string[];
  offerIds: string[];
}

// Read from festival_greeting (the single festival source), never stored here.
export interface FestivalInput { active: boolean; name: string | null }

// ---- config (admin-edited, versioned) ----------------------------------
export type CardTarget =
  | { type: 'categories'; categories: string[] }
  | { type: 'subcategory'; id: string }
  | { type: 'products'; productIds: string[] }
  | { type: 'tab'; id: 'fresh' | 'preorder' | 'udupi' }
  | { type: 'brands' }
  | { type: 'action'; id: 'add-usuals' | 'party-form' | 'preorder-list' | 'popular' | 'offers' | 'bulk' };

export type ImageSource = { mode: 'auto' } | { mode: 'picked'; productIds: string[] };

export interface ItemConfig {
  enabled: boolean;
  title: string; // <= 24
  line: string; // <= 40
  tag: string; // may hold the card's supported {placeholders}
  fallbackTag: string; // required when tag has a placeholder
  accent: string; // tag background + 10% image tint (cards stay white)
  tagText: '#FFFFFF' | '#FFD84D';
  categories: string[]; // data-check list for category cards
  target: CardTarget;
  images: ImageSource;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export type SlotKey = 'morning' | 'late-morning' | 'afternoon' | 'evening' | 'night' | 'late-night';
export interface SlotRule { key: SlotKey; from: number; to: number; hero: HeroId; cards: CardId[] } // IST minutes [from, to)

export interface Modifiers {
  monthStart: { on: boolean; fromDay: number; toDay: number; card: CardId; position: number };
  weekendParty: { on: boolean; days: number[]; fromMinute: number; card: CardId; position: number }; // 0=Sun
  festival: { on: boolean; position: number; titleTemplate: string; categories: string[] };
  rain: { on: boolean; until: string | null; fromMinute: number; card: CardId; position: number }; // until = ISO instant
  newUsers: { threshold: number };
}

export interface TodayGridConfig {
  items: Record<ItemId, ItemConfig>;
  slots: SlotRule[];
  backups: CardId[];
  modifiers: Modifiers;
}

// ---- output ------------------------------------------------------------
export interface GridCard {
  id: ItemId;
  title: string;
  tag: string;
  line: string;
  accent: string;
  tagBg: string;
  tagText: string;
  imageUrls: string[];
  target: CardTarget;
  price?: { amount: number; mrp: number | null }; // hero only
}

export type TraceStatus = 'shown' | 'no-data' | 'replaced' | 'backup' | 'not-in-slot' | 'disabled' | 'duplicate' | 'no-room';
export interface TraceRow { id: ItemId; status: TraceStatus; reason: string; position?: number }

export interface TodayGrid {
  hero: GridCard;
  cards: GridCard[];
  slot: SlotKey;
  refreshAt: string;
  trace: TraceRow[]; // why every item is or is not on screen (admin preview)
}
