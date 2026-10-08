export interface CopyKeyInfo { default: string; hint: string; kind?: 'image' }
export declare const COPY_KEYS: Record<string, CopyKeyInfo>;
export declare function copyDefault(key: string): string;
