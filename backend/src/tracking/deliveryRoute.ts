import { env } from '../config/env.js';
import { claimMapsBudget } from '../customer-experience/mapsBudget.js';
import { fetchRoute, type LatLng } from '../lib/routeDirections.js';
import { distanceKm } from '../utils/geo.js';

const ROUTE_TTL_MS = 60 * 60_000;
const UNAVAILABLE_TTL_MS = 60_000;
const MAX_ROUTES = 1000;
// A rider who takes another road gets a fresh route from where they are,
// but only a few times per delivery and not too often, whoever asks:
// worst case 1 + MAX_REROUTES Google calls per order, usually 1-2.
export const MAX_REROUTES = 3;
export const REROUTE_GAP_MS = 60_000;
// A "new" origin this close to the last one is the same road; reuse it.
const REROUTE_MIN_MOVE_METERS = 50;

interface Entry {
  route: Promise<LatLng[] | null>;
  origin: LatLng;
  reroutes: number;
  computedAt: number;
  expires: NodeJS.Timeout | undefined;
}

// Only decoded coordinates are held, scoped to this leg and address.
// Sharing the promise avoids duplicate provider calls for concurrent viewers
// on this replica. Entries expire even if the order is never viewed again.
const routes = new Map<string, Entry>();

async function loadRoute(origin: LatLng, destination: LatLng): Promise<LatLng[] | null> {
  try {
    if (await claimMapsBudget('provider') > 0) return null;
    // Basic car route (cheapest Routes tier).
    const route = await fetchRoute(origin, destination, 'HIGH_QUALITY');
    return route && route.points.length >= 2 ? route.points : null;
  } catch {
    // A quota store outage must not take down live order tracking.
    return null;
  }
}

function store(key: string, origin: LatLng, destination: LatLng, reroutes: number): Promise<LatLng[] | null> {
  const previous = routes.get(key);
  if (previous?.expires) clearTimeout(previous.expires);
  // A failed re-route (quota, provider error) keeps the route we had.
  const route = loadRoute(origin, destination).then(points => points ?? previous?.route ?? null);
  const entry: Entry = { route, origin, reroutes, computedAt: Date.now(), expires: undefined };
  routes.set(key, entry);
  void entry.route.then(points => {
    if (routes.get(key) !== entry) return;
    entry.expires = setTimeout(() => routes.delete(key), points ? ROUTE_TTL_MS : UNAVAILABLE_TTL_MS);
    entry.expires.unref();
  });
  return entry.route;
}

// One road route per delivery leg and address. The first request after
// pickup computes it from the rider's position then (else the store); every
// later request, from any viewer or app reopen, reuses it even as the rider
// moves along it. When the app sees the rider has left that road it asks
// with `reroute`: a fresh route from the rider's position, at most
// MAX_REROUTES times per delivery and REROUTE_GAP_MS apart. Past that the
// app keeps its free dashed rider -> customer line.
export function deliveryRoute(legId: string, origin: LatLng, destination: LatLng, reroute = false): Promise<LatLng[] | null> {
  if (!env.googleRoutesApiKey) return Promise.resolve(null);
  if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
    return Promise.resolve(null);
  }

  const key = [legId, destination.latitude, destination.longitude].join(':');
  const existing = routes.get(key);
  if (existing) {
    const allowed = reroute
      && existing.reroutes < MAX_REROUTES
      && Date.now() - existing.computedAt >= REROUTE_GAP_MS
      && distanceKm(existing.origin, origin) * 1000 >= REROUTE_MIN_MOVE_METERS;
    return allowed ? store(key, origin, destination, existing.reroutes + 1) : existing.route;
  }
  if (routes.size >= MAX_ROUTES) return Promise.resolve(null);
  return store(key, origin, destination, 0);
}
