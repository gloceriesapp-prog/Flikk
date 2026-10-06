import type { PublicFolder, R2Config } from './policy.cjs';
interface WriteResult { error: unknown; }
interface MetadataDatabase { from(table: 'media_assets'): { insert(row: Record<string, unknown>): PromiseLike<WriteResult>; update(row: Record<string, unknown>): { eq(column: string, value: string): PromiseLike<WriteResult> } }; }
export interface MediaDependencies { config: R2Config; db: MetadataDatabase; put(key: string, bytes: Buffer): Promise<void>; verifyDelivery(url: string): Promise<void>; remove(key: string): Promise<void>; }
export function uploadPublicImage(dependencies: MediaDependencies, input: { folder: PublicFolder | string; bytes: Buffer; scope?: string; uploadedBy?: string }): Promise<{ url: string; assetId: string; objectKey: string; provider: 'r2' }>;
