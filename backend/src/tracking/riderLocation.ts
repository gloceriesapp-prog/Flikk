// Customer-facing live rider position for the track-order map.
//
// Reads what PATCH /rider/status already writes (riders.current_lat/
// current_lng/last_location_update, migration 036) — no new columns. The
// rules are deliberately narrow:
//   * the caller must be the order's / trip's own customer (404 otherwise,
//     same as GET /orders/:id/live — existence is never confirmed);
//   * before a rider is assigned, return only the store and delivery pins;
//   * once a rider is assigned to this order (heading to the store) and
//     while it is out_for_delivery, return the rider's position and the
//     shared road route for that leg (legRoutes.ts: pickup = rider -> store,
//     drop = rider -> customer), the same route the rider app draws; never
//     after delivered/failed/cancelled;
//   * after pickup, a ping older than picked_up_at is withheld, so the first
//     drop-leg poll can't show a position from before pickup;
//   * positions older than the dispatch freshness window are flagged stale.
// The payload carries coordinates and timestamps only — no rider id, name,
// phone or status; the track screen already has the rider card for that.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import type { LatLng } from '../lib/routeDirections.js';
import { legRoute, type Leg } from './legRoutes.js';
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
  // true while a rider is heading to the store or out for delivery.
  active: boolean;
  // Which leg the map shows: rider -> store, or rider -> customer.
  leg?: Leg | null;
  // Version of that leg's saved route; it changes when the rider is
  // re-routed, telling the app to fetch the route again (?route=1).
  route_version?: number | null;
  rider_location: RiderLocation | null;
  // The order's own delivery-address pin (the customer's own data), so the
  // map can frame rider + destination without another detail fetch.
  destination: Coordinates | null;
  pickup?: Coordinates | null;
  route?: LatLng[] | null;
  stale_after_seconds: number;
}
interface RiderRow { current_lat: unknown; current_lng: unknown; last_location_update: string | null }
interface StoreCoordinates { lat: unknown; lng: unknown }
interface AddressSource { delivery_address_at_order?: unknown; addresses?: unknown }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = () => new AppError(503, 'TRACKING_UNAVAILABLE', 'Tracking is temporarily unavailable. Please retry.');
const inactive = (): RiderLocationResponse => ({ active: false, rider_location: null, destination: null, stale_after_seconds: RIDER_LOCATION_STALE_SECONDS });
export const isBeforePickup = (status: string) => status === 'placed' || status === 'packed';

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

export function pickupOf(stores: StoreCoordinates | StoreCoordinates[] | null): Coordinates | null {
  const store = Array.isArray(stores) ? stores[0] : stores;
  return toCoordinates(store?.lat, store?.lng);
}

function beforePickup(address: AddressSource, stores: StoreCoordinates | StoreCoordinates[] | null): RiderLocationResponse {
  return { ...inactive(), pickup: pickupOf(stores), destination: destinationOf(address) };
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

export async function readRider(riderId: string): Promise<RiderRow | null> {
  const { data, error } = await supabase.from('riders')
    .select('current_lat,current_lng,last_location_update').eq('user_id', riderId).maybeSingle();
  if (error) throw unavailable();
  return (data as RiderRow | null) ?? null;
}

function send(res: import('express').Response, body: RiderLocationResponse) {
  res.set('Cache-Control', 'private, no-store');
  res.json(body);
}

// One leg's tracking payload. The route itself (points) is opt-in with
// ?route=1 so the five-second position poll stays light; every poll still
// checks the rider against the saved road (re-routing if they left it) and
// returns its version.
async function legPayload(query: AuthedRequest['query'], orderId: string, leg: Leg, rider: RiderLocation | null,
  pickup: Coordinates | null, destination: Coordinates | null): Promise<RiderLocationResponse> {
  const body: RiderLocationResponse = { active: true, leg, rider_location: rider, destination, pickup, route_version: null, stale_after_seconds: RIDER_LOCATION_STALE_SECONDS };
  const target = leg === 'pickup' ? pickup : destination;
  if (!target) return body;
  const fresh = rider && !rider.stale ? rider : null;
  // Pickup starts at the rider; drop starts at the rider, else the store.
  const origin = fresh ?? (leg === 'drop' ? pickup : null);
  const route = await legRoute(orderId, leg,
    origin ? { latitude: origin.lat, longitude: origin.lng } : null,
    { latitude: target.lat, longitude: target.lng },
    fresh ? { point: { latitude: fresh.lat, longitude: fresh.lng }, at: fresh.updated_at } : null,
    query.route === '1',
  );
  return { ...body, route_version: route?.version ?? null, ...(query.route === '1' ? { route: route?.points ?? null } : {}) };
}

export const riderLocationOrdersRouter = Router();
export const riderLocationTripsRouter = Router();

riderLocationOrdersRouter.get('/:id/rider-location', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    if (!UUID.test(id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const { data: order, error } = await supabase.from('orders')
      .select('id,status,rider_id,picked_up_at,delivery_address_at_order,addresses(latitude,longitude),stores(lat,lng)')
      .eq('id', id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw unavailable();
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    if (isBeforePickup(order.status) && !order.rider_id) return send(res, beforePickup(order, order.stores));
    if (!isBeforePickup(order.status) && order.status !== 'out_for_delivery') return send(res, inactive());
    const leg: Leg = isBeforePickup(order.status) ? 'pickup' : 'drop';
    const rider = await readRider(order.rider_id!);
    send(res, await legPayload(req.query, order.id, leg, riderLocationView(rider, leg === 'drop' ? order.picked_up_at : null),
      pickupOf(order.stores), destinationOf(order)));
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
      .select('id,status,rider_id,picked_up_at,stores(lat,lng)')
      .eq('trip_id', trip.id).eq('customer_id', req.user!.id)
      .order('picked_up_at', { ascending: false, nullsFirst: false });
    if (legsError) throw unavailable();
    const pendingLegs = (legs ?? []).filter(l => isBeforePickup(l.status));
    const firstPending = pendingLegs[0];
    if (firstPending) {
      const pending = pendingLegs.find(l => l.status === 'packed' && pickupOf(l.stores))
        ?? pendingLegs.find(l => pickupOf(l.stores))
        ?? firstPending;
      // A rider heading to this store: rider -> store leg, same as the rider app.
      if (!pending.rider_id) return send(res, beforePickup(trip, pending.stores));
      const rider = await readRider(pending.rider_id);
      return send(res, await legPayload(req.query, pending.id, 'pickup', riderLocationView(rider, null), pickupOf(pending.stores), destinationOf(trip)));
    }
    // After all pickups, use the most recent pickup that has a rider.
    const activeLegs = (legs ?? []).filter(l => l.status === 'out_for_delivery');
    const leg = activeLegs.find(l => l.rider_id) ?? activeLegs[0];
    if (!leg) return send(res, inactive());
    const rider = leg.rider_id ? await readRider(leg.rider_id) : null;
    send(res, await legPayload(req.query, leg.id, 'drop', riderLocationView(rider, leg.picked_up_at), pickupOf(leg.stores), destinationOf(trip)));
  } catch (err) { next(err); }
});
