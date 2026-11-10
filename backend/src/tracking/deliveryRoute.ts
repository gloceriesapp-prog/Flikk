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

async function loadRoute(pickup: LatLng, destination: LatLng): Promise<LatLng[] | null> {
  try {
    if (await claimMapsBudget('provider') > 0) return null;
    const route = await fetchRoute(pickup, destination, 'HIGH_QUALITY');
    return route && route.points.length >= 2 ? route.points : null;
  } catch {
    // A quota store outage must not take down live order tracking.
    return null;
  }
}

export function deliveryRoute(legId: string, pickup: LatLng, destination: LatLng): Promise<LatLng[] | null> {
  if (!env.googleRoutesApiKey) return Promise.resolve(null);
  if (pickup.latitude === destination.latitude && pickup.longitude === destination.longitude) {
    return Promise.resolve(null);
  }

  const key = [legId, pickup.latitude, pickup.longitude, destination.latitude, destination.longitude].join(':');
  const pending = routes.get(key);
  if (pending) return pending;
  if (routes.size >= MAX_ROUTES) return Promise.resolve(null);

  const result = loadRoute(pickup, destination).then(points => {
    setTimeout(() => routes.delete(key), points ? ROUTE_TTL_MS : UNAVAILABLE_TTL_MS).unref();
    return points;
  });
  routes.set(key, result);
  return result;
}
