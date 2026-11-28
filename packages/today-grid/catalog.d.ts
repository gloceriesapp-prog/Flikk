import type { CardId, HeroId, ItemConfig, ItemId, ItemType, Placeholder } from './types.js';
export type CheckKind = 'categories' | 'usuals' | 'popular' | 'offers' | 'storeOpen' | 'preorder' | 'bulk' | 'party' | 'localBrands' | 'fish' | 'village' | 'vegetables' | 'always';
export interface ItemFacts {
    type: ItemType;
    check: CheckKind;
    placeholders: Placeholder[];
    rule: string;
}
export declare const ITEM_FACTS: Record<ItemId, ItemFacts>;
export declare const HERO_IDS: HeroId[];
export declare const CARD_IDS: CardId[];
export declare const ITEM_IDS: ItemId[];
export declare const ACCENT_PRESETS: string[];
export declare const TAG_TEXT_COLORS: readonly ["#FFFFFF", "#FFD84D"];
export declare const DEFAULT_ITEMS: Record<ItemId, ItemConfig>;
