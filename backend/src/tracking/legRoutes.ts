// Shared delivery routes: one saved road route per order and leg
// (migration 20261126090000_delivery_routes.sql), drawn identically by the
// customer app and the rider app.
//
//   pickup: rider -> store, worked out once a rider is heading to the store
//   drop:   rider (or store) -> customer, worked out after pickup
//
// Each leg costs one Google call. Every read checks the rider's latest fix
// against the saved road: two fixes in a row more than OFF_ROUTE_METERS off
// it (one stray GPS point is not a new road) re-route from the rider's
// position, at most MAX_REROUTES times per leg, REROUTE_GAP_MS apart and
// only after REROUTE_MIN_MOVE_METERS of movement. `version` goes up on each
// re-route so both apps redraw together. Opening or reopening a screen never
// calls Google.
import { supabase } from '../db/supabase.js';
import { claimMapsBudget } from '../customer-experience/mapsBudget.js';
import { fetchRoute, type LatLng } from '../lib/routeDirections.js';
import { env } from '../config/env.js';

export type Leg = 'pickup' | 'drop';
export const OFF_ROUTE_METERS = 35;
export const MAX_REROUTES = 3;
export const REROUTE_GAP_MS = 60_000;
export const REROUTE_MIN_MOVE_METERS = 50;
// A failed calculation (quota, provider error) is not retried for a minute.
const FAILURE_BACKOFF_MS = 60_000;

export interface LegRoute { leg: Leg; points: LatLng[]; version: number; distanceM: number | null; durationS: number | null }
export interface RiderFix { point: LatLng; at: string }

interface Row {
  points: [number, number][]; distance_m: number | null; duration_s: number | null;
  origin_lat: number; origin_lng: number; dest_lat: number; dest_lng: number;
  version: number; reroutes: number; off_streak: number; last_fix_at: string | null; computed_at: string;
}
const SELECT = 'points,distance_m,duration_s,origin_lat,origin_lng,dest_lat,dest_lng,version,reroutes,off_streak,last_fix_at,computed_at';

const METERS_PER_DEGREE = 111_320;
export function meters(a: LatLng, b: LatLng): number {
  const scale = METERS_PER_DEGREE * Math.cos(((a.latitude + b.latitude) / 2) * Math.PI / 180);
  return Math.hypot((a.latitude - b.latitude) * METERS_PER_DEGREE, (a.longitude - b.longitude) * scale);
}
// Shortest distance from a point to a polyline, in meters.
export function metersFromPath(point: LatLng, path: LatLng[]): number {
  const scale = METERS_PER_DEGREE * Math.cos(point.latitude * Math.PI / 180);
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    const ax = (path[i]!.longitude - point.longitude) * scale; const ay = (path[i]!.latitude - point.latitude) * METERS_PER_DEGREE;
    const dx = (path[i + 1]!.longitude - path[i]!.longitude) * scale; const dy = (path[i + 1]!.latitude - path[i]!.latitude) * METERS_PER_DEGREE;
    const length = dx * dx + dy * dy;
    const t = length ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / length)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return path.length === 1 ? meters(point, path[0]!) : best;
}

const toPoints = (raw: [number, number][]): LatLng[] => raw.map(([latitude, longitude]) => ({ latitude, longitude }));
const view = (leg: Leg, row: Row): LegRoute => ({ leg, points: toPoints(row.points), version: row.version, distanceM: row.distance_m, durationS: row.duration_s });

const failedAt = new Map<string, number>();
const inFlight = new Map<string, Promise<LegRoute | null>>();

async function calculate(origin: LatLng, destination: LatLng) {
  if (!env.googleRoutesApiKey) return null;
  try {
    if (await claimMapsBudget('provider') > 0) return null;
    // Basic car route: the cheapest Routes tier.
    const route = await fetchRoute(origin, destination, 'HIGH_QUALITY');
    return route && route.points.length >= 2 ? route : null;
  } catch {
    return null;
  }
}

async function readRow(orderId: string, leg: Leg): Promise<Row | null> {
  const { data, error } = await supabase.from('delivery_routes').select(SELECT).eq('order_id', orderId).eq('leg', leg).maybeSingle();
  if (error) throw error;
  return data as Row | null;
}

// The saved route for a leg, re-routed if the rider has really left it.
// `origin` is used only to work the route out the first time (rider for
// pickup, rider or store for drop); `fix` is the rider's latest fresh GPS
// fix, or null. `create` false only checks an existing route (light polls).
export async function legRoute(orderId: string, leg: Leg, origin: LatLng | null, destination: LatLng, fix: RiderFix | null, create = true): Promise<LegRoute | null> {
  const key = `${orderId}:${leg}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const work = resolve(key, orderId, leg, origin, destination, fix, create).finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}

async function resolve(key: string, orderId: string, leg: Leg, origin: LatLng | null, destination: LatLng, fix: RiderFix | null, create: boolean): Promise<LegRoute | null> {
  const row = await readRow(orderId, leg);
  const sameDestination = row && meters({ latitude: row.dest_lat, longitude: row.dest_lng }, destination) < 1;
  if (row && sameDestination) return checkRoute(key, orderId, leg, row, destination, fix);
  if (!create || !origin || Date.now() - (failedAt.get(key) ?? 0) < FAILURE_BACKOFF_MS) return row && sameDestination ? view(leg, row) : null;

  const route = await calculate(origin, destination);
  if (!route) { failedAt.set(key, Date.now()); return null; }
  const saved = {
    order_id: orderId, leg, points: route.points.map(p => [p.latitude, p.longitude]),
    distance_m: route.distanceM == null ? null : Math.round(route.distanceM), duration_s: route.durationSec == null ? null : Math.round(route.durationSec),
    origin_lat: origin.latitude, origin_lng: origin.longitude, dest_lat: destination.latitude, dest_lng: destination.longitude,
    version: (row?.version ?? 0) + 1, reroutes: 0, off_streak: 0, last_fix_at: null, computed_at: new Date().toISOString(),
  };
  // A new destination (address fix) replaces the old route; a first route
  // never overwrites one another replica saved a moment ago.
  const { error } = row
    ? await supabase.from('delivery_routes').update(saved).eq('order_id', orderId).eq('leg', leg)
    : await supabase.from('delivery_routes').upsert(saved, { onConflict: 'order_id,leg', ignoreDuplicates: true });
  if (error) throw error;
  const stored = await readRow(orderId, leg);
  return stored ? view(leg, stored) : null;
}

async function checkRoute(key: string, orderId: string, leg: Leg, row: Row, destination: LatLng, fix: RiderFix | null): Promise<LegRoute> {
  // Count each rider fix once, however many viewers poll.
  if (!fix || (row.last_fix_at && Date.parse(fix.at) <= Date.parse(row.last_fix_at))) return view(leg, row);
  const points = toPoints(row.points);
  const off = metersFromPath(fix.point, points) > OFF_ROUTE_METERS;
  const streak = off ? row.off_streak + 1 : 0;
  const origin = { latitude: row.origin_lat, longitude: row.origin_lng };
  const reroute = streak >= 2 && row.reroutes < MAX_REROUTES
    && Date.now() - Date.parse(row.computed_at) >= REROUTE_GAP_MS
    && meters(fix.point, origin) >= REROUTE_MIN_MOVE_METERS
    && Date.now() - (failedAt.get(key) ?? 0) >= FAILURE_BACKOFF_MS;
  if (reroute) {
    const route = await calculate(fix.point, destination);
    if (route) {
      const next = {
        points: route.points.map(p => [p.latitude, p.longitude]),
        distance_m: route.distanceM == null ? null : Math.round(route.distanceM), duration_s: route.durationSec == null ? null : Math.round(route.durationSec),
        origin_lat: fix.point.latitude, origin_lng: fix.point.longitude,
        version: row.version + 1, reroutes: row.reroutes + 1, off_streak: 0, last_fix_at: fix.at, computed_at: new Date().toISOString(),
      };
      // Only the request that still sees this version wins (concurrent viewers).
      const { data, error } = await supabase.from('delivery_routes').update(next)
        .eq('order_id', orderId).eq('leg', leg).eq('version', row.version).select(SELECT).maybeSingle();
      if (error) throw error;
      return data ? view(leg, data as Row) : view(leg, (await readRow(orderId, leg)) ?? row);
    }
    failedAt.set(key, Date.now());
  }
  // Only write when the off-road count changes; staying on the road is free.
  if (streak !== row.off_streak) {
    const { error } = await supabase.from('delivery_routes').update({ off_streak: streak, last_fix_at: fix.at })
      .eq('order_id', orderId).eq('leg', leg).eq('version', row.version);
    if (error) throw error;
  }
  return view(leg, row);
}
