export interface CopyKeyInfo { default: string; hint: string; kind?: 'image' | 'toggle' | 'select'; label?: string; options?: { value: string; label: string }[] }
export declare const COPY_KEYS: Record<string, CopyKeyInfo>;
export declare function copyDefault(key: string): string;
