export type HeroId = 'todays-catch' | 'village-fresh' | 'veg-for-tomorrow' | 'fresh-by-7' | 'fruits-vegetables';
export type CardId = 'milk-breakfast' | 'your-usuals' | 'popular-near-you' | 'breakfast-ready' | 'tea-coffee' | 'lunch-essentials' | 'offers-for-you' | 'taste-of-tulunadu' | 'glo-bulk' | 'namma-brands' | 'home-cleaning' | 'snack-time' | 'cold-drinks' | 'fish-meat' | 'tomorrow-by-7' | 'ice-cream' | 'late-night-snacks' | 'daily-needs' | 'daily-essentials' | 'party-orders' | 'festival-needs' | 'rainy-day';
export type ItemId = HeroId | CardId;
export type ItemType = 'hero' | 'rotating' | 'special';
export type Placeholder = 'min' | 'pct' | 'total' | 'time' | 'cutoff' | 'festival';
export interface ProductPeek {
    id: string;
    name: string;
    price: number;
    mrp: number | null;
    imageUrl: string;
}
export interface Stat {
    count: number;
    minPrice: number | null;
    minPriceMrp: number | null;
    maxDiscountPct: number | null;
    imageUrls: string[];
    top?: ProductPeek[];
}
export declare const EMPTY_STAT: Stat;
export interface LocalBrands {
    count: number;
    logoUrls: string[];
    brandIds: string[];
}
export interface Availability {
    openStores: number;
    categories: Record<string, Stat>;
    fish: Stat & {
        arrivedMinute: number | null;
    };
    villagePickedToday: Stat;
    vegetables: Stat;
    fruitsAndVegetables: Stat;
    preorder: {
        open: boolean;
        cutoffMinute: number | null;
    };
    bulk: Stat;
    party: Stat;
    popularThisWeek: Stat;
    localBrands: LocalBrands;
    products: Record<string, ProductPeek>;
}
export interface UserSummary {
    kind: 'guest' | 'customer';
    deliveredOrders: number;
    usuals: Stat;
    offers: Stat;
    usualIds: string[];
    offerIds: string[];
}
export interface FestivalInput {
    active: boolean;
    name: string | null;
}
export type CardTarget = {
    type: 'categories';
    categories: string[];
} | {
    type: 'subcategory';
    id: string;
} | {
    type: 'products';
    productIds: string[];
} | {
    type: 'tab';
    id: 'fresh' | 'preorder' | 'udupi';
} | {
    type: 'brands';
} | {
    type: 'action';
    id: 'add-usuals' | 'party-form' | 'preorder-list' | 'popular' | 'offers' | 'bulk';
};
export type ImageSource = {
    mode: 'auto';
} | {
    mode: 'picked';
    productIds: string[];
    photos?: Record<string, string>;
};
export interface ItemConfig {
    enabled: boolean;
    title: string;
    line: string;
    tag: string;
    fallbackTag: string;
    accent: string;
    tagText: '#FFFFFF' | '#FFD84D';
    categories: string[];
    target: CardTarget;
    images: ImageSource;
    bannerUrl: string | null;
    updatedBy?: string | null;
    updatedAt?: string | null;
}
export type SlotKey = 'morning' | 'late-morning' | 'afternoon' | 'evening' | 'night' | 'late-night';
export interface SlotRule {
    key: SlotKey;
    from: number;
    to: number;
    hero: HeroId;
    cards: CardId[];
}
export interface Modifiers {
    monthStart: {
        on: boolean;
        fromDay: number;
        toDay: number;
        card: CardId;
        position: number;
    };
    weekendParty: {
        on: boolean;
        days: number[];
        fromMinute: number;
        card: CardId;
        position: number;
    };
    festival: {
        on: boolean;
        position: number;
        titleTemplate: string;
        categories: string[];
    };
    rain: {
        on: boolean;
        until: string | null;
        fromMinute: number;
        card: CardId;
        position: number;
    };
    newUsers: {
        threshold: number;
    };
}
export interface TodayGridConfig {
    items: Record<ItemId, ItemConfig>;
    slots: SlotRule[];
    backups: CardId[];
    modifiers: Modifiers;
}
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
    price?: {
        amount: number;
        mrp: number | null;
    };
    products?: ProductPeek[];
    bannerUrl: string | null;
    categories: string[];
}
export type TraceStatus = 'shown' | 'no-data' | 'replaced' | 'backup' | 'not-in-slot' | 'disabled' | 'duplicate' | 'no-room';
export interface TraceRow {
    id: ItemId;
    status: TraceStatus;
    reason: string;
    position?: number;
}
export interface TodayGrid {
    hero: GridCard;
    cards: GridCard[];
    slot: SlotKey;
    refreshAt: string;
    trace: TraceRow[];
}
