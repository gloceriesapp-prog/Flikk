// Automated rider dispatch — explicit CLAUDE.md scope override (see that
// file's own Scope discipline section). Backs the three real endpoints
// backend/src/routes/rider.ts adds for this: presence/location, the
// "available pickups near me" list, and the atomic accept-race itself.

import { apiRequest, ApiError } from './client';

const DELIVERY_FEE = 25;

export function updateRiderStatus(patch: { status?: 'online' | 'offline'; lat?: number; lng?: number }): Promise<void> {
  return apiRequest('/rider/status', { method: 'PATCH', body: patch });
}

interface RawDispatchOffer {
  id: string;
  order_number: string;
  delivery_fee: number;
  trip_id: string | null;
  trips: { delivery_fee: number } | null;
  stores: { name: string } | null;
  distance_m: number | null;
}

export interface DispatchOffer {
  orderId: string;
  orderNumber: string;
  storeName: string;
  payout: number;
  distanceKm: number;
}

function toDispatchOffer(row: RawDispatchOffer): DispatchOffer {
  return {
    orderId: row.id,
    orderNumber: `FLK-${row.id.slice(0, 6).toUpperCase()}`,
    storeName: row.stores?.name ?? 'Store',
    // Same trip-aware payout rule as api/orders.ts's own toRiderOrder —
    // a trip leg pays the trip's own combined fee, never the flat
    // single-store DELIVERY_FEE.
    payout: row.trips?.delivery_fee ?? row.delivery_fee ?? DELIVERY_FEE,
    distanceKm: row.distance_m != null ? Math.round((row.distance_m / 1000) * 10) / 10 : 0,
  };
}

export async function fetchDispatchOffers(lat: number, lng: number): Promise<DispatchOffer[]> {
  const rows = await apiRequest<RawDispatchOffer[]>(`/rider/dispatch-offers?lat=${lat}&lng=${lng}`);
  return rows.map(toDispatchOffer);
}

export type AcceptDispatchOfferResult = { ok: true } | { ok: false; alreadyTaken: boolean; message: string };

// Never throws — a lost race (ALREADY_TAKEN, 409) is a completely normal,
// expected outcome of a real multi-rider broadcast, not an error the
// caller should have to catch. Any other failure (network, auth) is still
// reported, just via the same result shape rather than a thrown ApiError.
export async function acceptDispatchOffer(orderId: string): Promise<AcceptDispatchOfferResult> {
  try {
    await apiRequest(`/rider/orders/${orderId}/accept`, { method: 'POST' });
    return { ok: true };
  } catch (err) {
    const alreadyTaken = err instanceof ApiError && err.status === 409;
    return {
      ok: false,
      alreadyTaken,
      message: alreadyTaken ? 'Another rider already accepted this order.' : 'Could not accept this order. Please try again.',
    };
  }
}
