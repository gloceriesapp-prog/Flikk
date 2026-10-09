// Automated rider dispatch — explicit CLAUDE.md scope override (see that
// file's own Scope discipline section). Backs the three real endpoints
// backend/src/routes/rider.ts adds for this: presence/location, the
// "available pickups near me" list, and the atomic accept-race itself.

import { apiRequest, ApiError } from './client';
import { distanceKm } from '../utils/geo';
import type { Coordinates } from '../data/mockOrders';

// Fallback for how long an offer stays open before the dispatch worker
// widens it — the real value is the admin's delivery_settings.
// dispatch_step_seconds, sent per offer as offer_window_seconds (migration
// 113). Used to turn the server's dispatch_broadcast_at into a real
// countdown deadline.
export const DISPATCH_OFFER_WINDOW_MS = 45_000;

export function updateRiderStatus(patch: { status?: 'online' | 'offline'; lat?: number; lng?: number }): Promise<void> {
  return apiRequest('/rider/status', { method: 'PATCH', body: patch });
}

interface RawDispatchOffer {
  id: string;
  order_number: string;
  trip_id: string | null;
  // What the rider earns for this order or whole trip (admin pay rule).
  rider_payout: number;
  stores: { name: string; lat: number | null; lng: number | null } | null;
  addresses: { line1: string; landmark: string | null; latitude: number | null; longitude: number | null } | null;
  order_items: { quantity: number }[] | null;
  dispatch_broadcast_at: string | null;
  // Admin-set ring window in seconds (absent from an older backend).
  offer_window_seconds?: number | null;
  distance_m: number | null;
  payment_method: 'cod' | 'online';
  cash_to_collect: number;
}

export interface DispatchOffer {
  orderId: string;
  orderNumber: string;
  storeName: string;
  payout: number;
  // Rider → store (from the RPC's own distance_m). storeToDropKm is the
  // store → customer leg (straight-line from the two coords). totalKm is
  // the sum — the whole job the rider signs up for, what the offer's
  // "total distance" tile shows.
  pickupKm: number;
  storeToDropKm: number;
  totalKm: number;
  // Human label for the drop end of the route (landmark or address line),
  // e.g. "Manipal" — not the customer's name (privacy pre-acceptance).
  dropLabel: string;
  itemCount: number;
  // Only present when BOTH ends have real coords — the offer card guards
  // its map/route preview on this so a phantom {0,0} never renders as
  // null-island (see plan blocker on addresses.latitude/longitude).
  storeCoords: Coordinates | null;
  dropCoords: Coordinates | null;
  // Real per-offer countdown deadline (epoch ms): dispatch_broadcast_at +
  // DISPATCH_OFFER_WINDOW_MS. null when the server didn't send a broadcast
  // timestamp — the ring then falls back to its mount-seeded window.
  expiresAt: number | null;
  // Admin-set ring window (seconds) the deadline was derived from; the
  // countdown ring's full arc. Absent when the server did not send one.
  windowSeconds?: number;
  // Cash on delivery: the rider collects cashToCollect at the door.
  paymentMethod: 'cod' | 'online';
  cashToCollect: number;
}

function coordsOf(lat: number | null | undefined, lng: number | null | undefined): Coordinates | null {
  return lat != null && lng != null && (lat !== 0 || lng !== 0) ? { latitude: lat, longitude: lng } : null;
}

function toDispatchOffer(row: RawDispatchOffer): DispatchOffer {
  const storeCoords = coordsOf(row.stores?.lat, row.stores?.lng);
  const dropCoords = coordsOf(row.addresses?.latitude, row.addresses?.longitude);
  const pickupKm = row.distance_m != null ? Math.round((row.distance_m / 1000) * 10) / 10 : 0;
  const storeToDropKm = storeCoords && dropCoords ? distanceKm(storeCoords, dropCoords) : 0;
  const itemCount = (row.order_items ?? []).reduce((sum, oi) => sum + oi.quantity, 0);

  return {
    orderId: row.id,
    orderNumber: `FLK-${row.id.slice(0, 6).toUpperCase()}`,
    storeName: row.stores?.name ?? 'Store',
    // Backend-computed rider payout (whole trip on a trip leg).
    payout: Number(row.rider_payout) || 0,
    pickupKm,
    storeToDropKm,
    totalKm: Math.round((pickupKm + storeToDropKm) * 10) / 10,
    dropLabel: row.addresses?.landmark || row.addresses?.line1 || 'Drop location',
    itemCount,
    storeCoords,
    dropCoords,
    expiresAt: row.dispatch_broadcast_at
      ? Date.parse(row.dispatch_broadcast_at) + (row.offer_window_seconds ? row.offer_window_seconds * 1000 : DISPATCH_OFFER_WINDOW_MS)
      : null,
    windowSeconds: row.offer_window_seconds || undefined,
    paymentMethod: row.payment_method === 'online' ? 'online' : 'cod',
    cashToCollect: Number(row.cash_to_collect) || 0,
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
    // RIDER_AT_CAPACITY: the rider already holds the admin's maximum active
    // deliveries (migration 113) — not a lost race, so show the server's reason.
    if (err instanceof ApiError && err.code === 'RIDER_AT_CAPACITY') {
      return { ok: false, alreadyTaken: false, message: err.message };
    }
    const alreadyTaken = err instanceof ApiError && err.status === 409;
    return {
      ok: false,
      alreadyTaken,
      message: alreadyTaken ? 'Another rider already accepted this order.' : 'Could not accept this order. Please try again.',
    };
  }
}
