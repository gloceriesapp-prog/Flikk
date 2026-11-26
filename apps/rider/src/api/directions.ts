// The shared saved road route for one leg of an order (GET
// /rider/orders/:id/route, server tracking/legRoutes.ts): rider -> store
// (pickup) or rider -> customer (drop). It is the same route the customer's
// track screen draws, worked out once per leg on the server; reopening the
// map costs nothing, and a rider who leaves the road is re-routed on the
// server for both apps (version goes up). polyline is [] and
// durationMin/distanceKm are null when routing is unavailable;
// DeliveryMapView then draws its straight connector and callers keep their
// avg-speed ETA, so this never blocks the map.

import { apiRequest } from './client';
import type { Coordinates } from '../location/riderLocation';

export type RouteLeg = 'pickup' | 'drop';

export interface RouteInfo {
  polyline: Coordinates[];
  // Google's driving time/length for the route, or null when unavailable.
  durationMin: number | null;
  distanceKm: number | null;
}

export interface SharedRoute extends RouteInfo {
  leg: RouteLeg;
  // Goes up when the server re-routes; null until the route exists.
  version: number | null;
}

export function fetchOrderRoute(orderId: string, leg: RouteLeg): Promise<SharedRoute> {
  return apiRequest<SharedRoute>(`/rider/orders/${encodeURIComponent(orderId)}/route?leg=${leg}`);
}
