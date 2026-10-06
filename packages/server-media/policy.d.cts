export type PublicFolder = 'appsui' | 'banners' | 'categories' | 'festivals' | 'illustrations' | 'products' | 'stores';
export const PUBLIC_FOLDERS: readonly PublicFolder[];
export class MediaError extends Error { code: string; status: number; constructor(code: string, message: string, status?: number); }
export function publicFolder(value: string): PublicFolder;
export interface R2Config { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicBaseUrl: string; }
export function r2Config(environment: Record<string, string | undefined>): R2Config;
