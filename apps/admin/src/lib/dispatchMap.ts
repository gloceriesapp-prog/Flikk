// Pure shaping for the dispatch map (app/api/dispatch-map). Kept out of the
// route and the client component so the "which rider is plottable" rule and
// the store/customer pin extraction are testable without Supabase or Leaflet.
// Run the check: npx tsx src/lib/dispatchMap.selfcheck.ts

import { isFreshPing } from './riderPresence';

export interface MapRider {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MapPin {
  lat: number;
  lng: number;
}

export interface MapOrder {
  id: string;
  status: string;
  storeName: string;
  store: MapPin | null;
  customer: MapPin | null;
}

export interface RiderRow {
  id: string;
  name: string;
  status: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
}

// Supabase returns an embedded one-to-one row as an object, but typing it as
// an array is also valid, so normalise both shapes.
type Embedded<T> = T | T[] | null;

export interface OrderRow {
  id: string;
  status: string;
  store: Embedded<{ name: string | null; lat: number | null; lng: number | null }>;
  address: Embedded<{ latitude: number | null; longitude: number | null }>;
}

function one<T>(value: Embedded<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pin(lat: number | null | undefined, lng: number | null | undefined): MapPin | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

// Online riders with a fresh ping and a real coordinate — the ones worth a dot.
export function toMapRiders(rows: RiderRow[], now: number): MapRider[] {
  const riders: MapRider[] = [];
  for (const row of rows) {
    if (row.status !== 'online') continue;
    if (row.current_lat == null || row.current_lng == null) continue;
    if (!isFreshPing(row.last_location_update, now)) continue;
    riders.push({ id: row.id, name: row.name, lat: row.current_lat, lng: row.current_lng });
  }
  return riders;
}

export function toMapOrders(rows: OrderRow[]): MapOrder[] {
  return rows.map((row) => {
    const store = one(row.store);
    const address = one(row.address);
    return {
      id: row.id,
      status: row.status,
      storeName: store?.name ?? 'Store',
      store: pin(store?.lat, store?.lng),
      customer: pin(address?.latitude, address?.longitude),
    };
  });
}
