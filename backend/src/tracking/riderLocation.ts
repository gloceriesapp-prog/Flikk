// Customer-facing live rider position for the track-order map.
//
// Reads what PATCH /rider/status already writes (riders.current_lat/
// current_lng/last_location_update, migration 036) — no new columns. The
// rules are deliberately narrow:
//   * the caller must be the order's / trip's own customer (404 otherwise,
//     same as GET /orders/:id/live — existence is never confirmed);
//   * a position is only returned while the order (or, for a trip, a leg) is
//     out_for_delivery — never while placed/packed (the rider may still be
//     at home or on another job) and never after delivered/failed/cancelled;
//   * a ping older than the leg's picked_up_at is withheld too, so the first
//     poll after pickup can't reveal where the rider was beforehand;
//   * positions older than the dispatch freshness window are flagged stale.
// The payload carries coordinates and timestamps only — no rider id, name,
// phone or status; the track screen already has the rider card for that.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';

// Same window every dispatch RPC treats as "fresh" (rider_dispatch_offers /
// nearby_dispatchable_riders, migrations 107/110/113:
// last_location_update > now() - interval '3 minutes').
export const RIDER_LOCATION_STALE_SECONDS = 180;

export interface Coordinates { lat: number; lng: number }
export interface RiderLocation extends Coordinates {
  updated_at: string;
  age_seconds: number;
  stale: boolean;
}
export interface RiderLocationResponse {
  // true only while an out_for_delivery order/leg exists for this customer.
  active: boolean;
  rider_location: RiderLocation | null;
  // The order's own delivery-address pin (the customer's own data), so the
  // map can frame rider + destination without another detail fetch.
  destination: Coordinates | null;
  stale_after_seconds: number;
}
interface RiderRow { current_lat: unknown; current_lng: unknown; last_location_update: string | null }
interface AddressSource { delivery_address_at_order?: unknown; addresses?: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = () => new AppError(503, 'TRACKING_UNAVAILABLE', 'Tracking is temporarily unavailable. Please retry.');
const inactive = (): RiderLocationResponse => ({ active: false, rider_location: null, destination: null, stale_after_seconds: RIDER_LOCATION_STALE_SECONDS });

// numeric columns can arrive as strings; (0,0) is a never-set GPS default.
export function toCoordinates(lat: unknown, lng: unknown): Coordinates | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') return null;
  const la = Number(lat); const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180 || (la === 0 && ln === 0)) return null;
  return { lat: la, lng: ln };
}

// Prefer the immutable checkout snapshot (latitude/longitude, migration
// 20261011000000); older orders fall back to the joined address row.
export function destinationOf(row: AddressSource): Coordinates | null {
  for (const source of [row.delivery_address_at_order, Array.isArray(row.addresses) ? row.addresses[0] : row.addresses]) {
    if (source && typeof source === 'object') {
      const { latitude, longitude } = source as { latitude?: unknown; longitude?: unknown };
      const coords = toCoordinates(latitude, longitude);
      if (coords) return coords;
    }
  }
  return null;
}

export function riderLocationView(rider: RiderRow | null, pickedUpAt: string | null, now = Date.now()): RiderLocation | null {
  if (!rider?.last_location_update) return null;
  const coords = toCoordinates(rider.current_lat, rider.current_lng);
  const updated = Date.parse(rider.last_location_update);
  if (!coords || !Number.isFinite(updated)) return null;
  const pickedUp = pickedUpAt ? Date.parse(pickedUpAt) : NaN;
  if (Number.isFinite(pickedUp) && updated < pickedUp) return null;
  // A rider clock can't run ahead of ours (the server stamps the ping), but
  // DB/app clock drift can; never report a negative age.
  const age = Math.max(0, Math.floor((now - updated) / 1000));
  return { ...coords, updated_at: new Date(updated).toISOString(), age_seconds: age, stale: age > RIDER_LOCATION_STALE_SECONDS };
}

async function readRider(riderId: string): Promise<RiderRow | null> {
  const { data, error } = await supabase.from('riders')
    .select('current_lat,current_lng,last_location_update').eq('user_id', riderId).maybeSingle();
  if (error) throw unavailable();
  return (data as RiderRow | null) ?? null;
}

function send(res: import('express').Response, body: RiderLocationResponse) {
  res.set('Cache-Control', 'private, no-store');
  res.json(body);
}

export const riderLocationOrdersRouter = Router();
export const riderLocationTripsRouter = Router();

riderLocationOrdersRouter.get('/:id/rider-location', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    if (!UUID.test(id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const { data: order, error } = await supabase.from('orders')
      .select('id,status,rider_id,picked_up_at,delivery_address_at_order,addresses(latitude,longitude)')
      .eq('id', id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw unavailable();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (order.status !== 'out_for_delivery' || !order.rider_id) return send(res, inactive());
    const rider = await readRider(order.rider_id);
    send(res, { active: true, rider_location: riderLocationView(rider, order.picked_up_at),
      destination: destinationOf(order), stale_after_seconds: RIDER_LOCATION_STALE_SECONDS });
  } catch (err) { next(err); }
});

riderLocationTripsRouter.get('/:id/rider-location', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    if (!UUID.test(id)) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
    const { data: trip, error } = await supabase.from('trips')
      .select('id,delivery_address_at_order,addresses(latitude,longitude)')
      .eq('id', id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw unavailable();
    if (!trip) throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
    const { data: legs, error: legsError } = await supabase.from('orders')
      .select('id,status,rider_id,picked_up_at')
      .eq('trip_id', trip.id).eq('customer_id', req.user!.id).eq('status', 'out_for_delivery')
      .order('picked_up_at', { ascending: false, nullsFirst: false });
    if (legsError) throw unavailable();
    // One rider normally carries every leg; if legs were split, follow the
    // most recent pickup (the leg actually heading to the customer now).
    const leg = (legs ?? []).find(l => l.status === 'out_for_delivery' && l.rider_id);
    if (!leg) return send(res, inactive());
    const rider = await readRider(leg.rider_id as string);
    send(res, { active: true, rider_location: riderLocationView(rider, leg.picked_up_at),
      destination: destinationOf(trip), stale_after_seconds: RIDER_LOCATION_STALE_SECONDS });
  } catch (err) { next(err); }
});
