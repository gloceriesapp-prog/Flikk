import type { CardDef, CardId, HeroId } from './types.js';
export declare const NAVY_TAG_TEXT = "#FFD84D";
type Def = Omit<CardDef, 'id'>;
export declare const CARD_CATALOG: Record<CardId, Def>;
export declare const CARD_IDS: CardId[];
export interface HeroDef {
    title: string;
    tag: string;
    line: string;
    accent: string;
    tagText?: string;
}
export declare const HERO_CATALOG: Record<HeroId, HeroDef>;
export {};
