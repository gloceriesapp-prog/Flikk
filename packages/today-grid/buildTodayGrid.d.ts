import { type IstClock } from './istClock.js';
import { type Availability, type CardId, type FestivalInput, type ItemConfig, type ItemId, type SlotRule, type Stat, type TodayGrid, type TodayGridConfig, type UserSummary } from './types.js';
export declare const MAX_CARDS = 4;
export interface BuildInput {
    now: Date;
    user: UserSummary;
    availability: Availability;
    config: TodayGridConfig;
    festival: FestivalInput;
}
export declare function slotFor(clock: IstClock, config: TodayGridConfig): SlotRule;
export declare function itemConfig(id: ItemId, config: TodayGridConfig, festival: FestivalInput): ItemConfig;
export declare function itemStat(id: ItemId, item: ItemConfig, user: UserSummary, a: Availability, newUserThreshold: number): Stat | null;
export declare function renderTag(item: ItemConfig, stat: Stat, a: Availability): string;
export declare function rainOn(config: TodayGridConfig, now: Date): boolean;
export declare function applyModifiers(base: CardId[], clock: IstClock, now: Date, user: UserSummary, config: TodayGridConfig, festival: FestivalInput): {
    cards: CardId[];
    notes: string[];
};
export declare function nextChangeAt(now: Date, config: TodayGridConfig): Date;
export declare function buildTodayGrid({ now, user, availability: a, config, festival }: BuildInput): TodayGrid & {
    modifierNotes: string[];
};
