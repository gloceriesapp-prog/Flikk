import type { CardId } from './types.js';
export interface SlotRule {
    key: string;
    from: number;
    to: number;
    cards: CardId[];
}
export interface CardOverride {
    enabled?: boolean;
    title?: string;
    line?: string;
    accent?: string;
    categories?: string[];
}
export interface TodayGridConfig {
    slots: SlotRule[];
    backups: CardId[];
    cards: Partial<Record<CardId, CardOverride>>;
    festival: {
        active: boolean;
        from: string | null;
        to: string | null;
    };
    rain: boolean;
}
export declare const DEFAULT_CONFIG: TodayGridConfig;
export declare function parseConfig(raw: unknown): TodayGridConfig;
