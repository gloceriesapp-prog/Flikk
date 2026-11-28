import type { Placeholder } from './types.js';
export declare const ALL_PLACEHOLDERS: Placeholder[];
export declare function placeholdersIn(template: string): string[];
export declare function fill(template: string, values: Partial<Record<Placeholder, string | null>>): string | null;
