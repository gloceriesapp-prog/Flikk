export type CardId = 'milk-breakfast' | 'your-usuals' | 'popular-near-you' | 'breakfast-ready' | 'tea-coffee' | 'lunch-essentials' | 'offers-for-you' | 'taste-of-tulunadu' | 'glo-bulk' | 'namma-brands' | 'home-cleaning' | 'snack-time' | 'cold-drinks' | 'fish-meat' | 'tomorrow-by-7' | 'ice-cream' | 'late-night-snacks' | 'daily-needs' | 'daily-essentials' | 'party-orders' | 'festival-needs' | 'rainy-day';
export type HeroId = 'todays-catch' | 'village-fresh' | 'veg-for-tomorrow' | 'fresh-by-7' | 'fruits-vegetables';
export interface Stat {
    count: number;
    minPrice: number | null;
    minPriceMrp: number | null;
    maxDiscountPct: number | null;
    imageUrls: string[];
}
export declare const EMPTY_STAT: Stat;
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
    brands: Stat;
}
export interface UserSummary {
    kind: 'guest' | 'customer';
    deliveredOrders: number;
    usuals: Stat;
    offers: Stat;
    usualIds: string[];
    offerIds: string[];
}
export type CardTarget = {
    type: 'categories';
    categories: string[];
} | {
    type: 'tab';
    id: 'fresh' | 'preorder' | 'udupi';
} | {
    type: 'usuals';
} | {
    type: 'popular';
} | {
    type: 'offers';
} | {
    type: 'bulk';
} | {
    type: 'brands';
} | {
    type: 'form';
    id: 'party';
};
export type DataCheck = {
    kind: 'categories';
    min: number;
} | {
    kind: 'usuals';
} | {
    kind: 'popular';
} | {
    kind: 'offers';
} | {
    kind: 'storeOpen';
} | {
    kind: 'preorder';
} | {
    kind: 'bulk';
} | {
    kind: 'party';
} | {
    kind: 'brands';
};
export interface CardDef {
    id: CardId;
    title: string;
    tag: string;
    fallbackTag: string;
    line: string;
    accent: string;
    tagText?: string;
    categories: string[];
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
    price?: {
        amount: number;
        mrp: number | null;
    };
}
export interface TodayGrid {
    hero: GridCard;
    cards: GridCard[];
    slot: string;
    refreshAt: string;
}
