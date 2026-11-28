import { ACCENT_PRESETS } from './catalog.js';
import type { CardId, Modifiers, SlotKey, SlotRule, TodayGridConfig } from './types.js';
export declare const DEFAULT_SLOTS: SlotRule[];
export declare const DEFAULT_BACKUPS: CardId[];
export declare const DEFAULT_MODIFIERS: Modifiers;
export declare const SLOT_KEYS: SlotKey[];
export declare const DEFAULT_CONFIG: TodayGridConfig;
export declare const LIMITS: {
    readonly title: 24;
    readonly line: 40;
    readonly tag: 24;
    readonly categories: 12;
    readonly pickedImages: 2;
    readonly pinnedProducts: 30;
};
export interface ConfigError {
    path: string;
    message: string;
    suggestion?: string;
}
export declare function readConfig(raw: unknown): TodayGridConfig;
export declare function slotCoverageErrors(slots: {
    key: string;
    from: number;
    to: number;
}[]): ConfigError[];
export declare function validateConfig(raw: unknown): {
    config: TodayGridConfig;
    errors: ConfigError[];
};
export { ACCENT_PRESETS };
