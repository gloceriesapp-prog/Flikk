import type { Request } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export function readCoordinates(query: Request['query']) {
  const parse = (value: unknown, maximum: number) => {
    if (typeof value !== 'string' || value.trim() === '') return NaN;
    const number = Number(value);
    return Number.isFinite(number) && Math.abs(number) <= maximum ? number : NaN;
  };
  const lat = parse(query.lat, 90);
  const lng = parse(query.lng, 180);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw new AppError(400, 'INVALID_COORDINATES', 'Valid latitude and longitude are required.');
  const zoneId = query.zone_id;
  if (zoneId !== undefined && (typeof zoneId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zoneId)))
    throw new AppError(400, 'INVALID_ZONE', 'Choose a valid delivery zone.');
  return { lat, lng, zoneId: zoneId as string | undefined };
}

// Exact coordinates remain authoritative: rounding a shared result can put a
// customer across a store's delivery boundary. PostgreSQL bounds candidates
// through the spatial index and ranks only those candidates, returning <=20.
export async function nearbyStores(lat: number, lng: number, zoneId: string | undefined, limit: number, maximum: number | null) {
  const { data, error } = await supabase.rpc('nearby_customer_stores', {
    p_lat: lat, p_lng: lng, p_zone: zoneId ?? null, p_limit: limit, p_max_km: maximum,
  });
  if (error) throw error; // No full-zone fallback if the migration is missing.
  return (data ?? []).map((row: { store: Record<string, unknown>; distance_km: number }) => ({ ...row.store, distance_km: row.distance_km }));
}
