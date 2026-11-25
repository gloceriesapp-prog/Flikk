import { env } from '../config/env.js';
import { claimMapsBudget } from '../customer-experience/mapsBudget.js';
import { fetchRoute, type LatLng } from '../lib/routeDirections.js';

const ROUTE_TTL_MS = 60 * 60_000;
const UNAVAILABLE_TTL_MS = 60_000;
const MAX_ROUTES = 1000;

// Only decoded coordinates are held, scoped to this leg and endpoint pair.
// Sharing the promise avoids duplicate provider calls for concurrent viewers
// on this replica. Entries expire even if the order is never viewed again.
const routes = new Map<string, Promise<LatLng[] | null>>();

async function loadRoute(origin: LatLng, destination: LatLng): Promise<LatLng[] | null> {
  try {
    if (await claimMapsBudget('provider') > 0) return null;
    // Basic car route (cheapest Routes tier): one call per delivery.
    const route = await fetchRoute(origin, destination, 'HIGH_QUALITY');
    return route && route.points.length >= 2 ? route.points : null;
  } catch {
    // A quota store outage must not take down live order tracking.
    return null;
  }
}

// One road route per delivery leg and address: the first request after
// pickup computes it from the rider's position then (else the store), and
// every later request for that leg, from any viewer or app reopen, reuses it
// for an hour even as the rider moves. That keeps Google at about one call
// per order; a rider who leaves the road gets the app's free dashed line.
export function deliveryRoute(legId: string, origin: LatLng, destination: LatLng): Promise<LatLng[] | null> {
  if (!env.googleRoutesApiKey) return Promise.resolve(null);
  if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
    return Promise.resolve(null);
  }

  const key = [legId, destination.latitude, destination.longitude].join(':');
  const pending = routes.get(key);
  if (pending) return pending;
  if (routes.size >= MAX_ROUTES) return Promise.resolve(null);

  const result = loadRoute(origin, destination).then(points => {
    setTimeout(() => routes.delete(key), points ? ROUTE_TTL_MS : UNAVAILABLE_TTL_MS).unref();
    return points;
  });
  routes.set(key, result);
  return result;
}
