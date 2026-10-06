import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { supabase } from '../db/supabase.js';
import { nearbyStores, readCoordinates } from '../discovery/nearbyStores.js';
import { AppError } from '../lib/errors.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function deliveryStores(query: Request['query']): Promise<string[]> {
  if (query.lat === undefined && query.lng === undefined) return [];
  const { lat, lng, zoneId } = readCoordinates(query);
  return (await nearbyStores(lat, lng, zoneId, 20, null)).map((s: Record<string, unknown>) => String(s.id));
}
export function browsePage(query: Request['query'], scope: unknown) {
  const fingerprint = createHash('sha256').update(JSON.stringify(scope)).digest('hex').slice(0, 32);
  const limit = query.limit === undefined ? 30 : Number(query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 60) throw new AppError(400, 'INVALID_PAGE', 'Invalid page size.');
  let after: { id: string; score: number } | null = null;
  if (query.after) {
    try {
      if (typeof query.after !== 'string' || query.after.length > 1024) throw new Error();
      const value = JSON.parse(Buffer.from(query.after, 'base64url').toString());
      if (value.scope !== fingerprint || typeof value.id !== 'string' || !UUID.test(value.id) || !Number.isFinite(value.score)) throw new Error();
      after = value;
    } catch { throw new AppError(400, 'INVALID_CURSOR', 'Refresh this product list.'); }
  }
  return { limit, after, cursor: (row: { id: string; score: number }) => Buffer.from(JSON.stringify({ ...row, scope: fingerprint })).toString('base64url') };
}
export async function hydrateBrowse(ids: { id: string }[], stores: string[], fields: string) {
  if (!ids.length || !stores.length) return [];
  const { data, error } = await supabase.from('products').select(fields).in('id', ids.map(r => r.id)).in('store_id', stores)
    .eq('approval_status', 'approved');
  if (error) throw error;
  return ids.flatMap(id => (data ?? []).filter(row => (row as unknown as { id: string }).id === id.id));
}
export function optionalUuid(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !UUID.test(value)) throw new AppError(400, 'INVALID_CATEGORY', 'Invalid category.');
  return value;
}
