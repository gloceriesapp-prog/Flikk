export type HomeProductLayout = 'horizontal' | 'grid';
export function isCustomHomeSection(key: string): boolean;
export function isHomeProductLayout(value: unknown): value is HomeProductLayout;
export function defaultHomeProductLayout(key: string): HomeProductLayout | null;
export function homeProductLayout(key: string, override?: unknown): HomeProductLayout | null;
export function homePreviewLimit(layout: HomeProductLayout): number;

export const DEFAULT_PREORDER_BANNER: string;

export function supportsHomeBanner(key: string): boolean;
