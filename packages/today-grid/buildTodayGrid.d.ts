import type { TodayGridConfig } from './config.js';
import { type IstClock } from './istClock.js';
import { type Availability, type CardDef, type CardId, type GridCard, type Stat, type TodayGrid, type UserSummary } from './types.js';
export declare const MAX_CARDS = 4;
export interface BuildInput {
    now: Date;
    user: UserSummary;
    availability: Availability;
    config: TodayGridConfig;
}
export declare function pickHero(clock: IstClock, a: Availability): GridCard;
export declare function slotFor(clock: IstClock, config: TodayGridConfig): import("./config.js").SlotRule;
export declare function applyModifiers(base: CardId[], clock: IstClock, user: UserSummary, config: TodayGridConfig): CardId[];
export declare function cardDefinition(id: CardId, config: TodayGridConfig): CardDef;
export declare function cardStat(def: CardDef, user: UserSummary, a: Availability): Stat | null;
export declare function renderTag(def: CardDef, stat: Stat, a: Availability): string;
export declare function nextChangeAt(now: Date, config: TodayGridConfig): Date;
export declare function buildTodayGrid({ now, user, availability: a, config }: BuildInput): TodayGrid;
