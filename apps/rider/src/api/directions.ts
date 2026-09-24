// Routed (road-following) line + real driving ETA for the delivery map — GET
// /rider/route proxies Google Directions server-side (the app's Maps-SDK key
// can't make that REST call). polyline is [] and durationMin/distanceKm are
// null when routing is unavailable; DeliveryMapView then draws its straight
// connector and callers keep their straight-line avg-speed ETA, so this never
// blocks the map rendering.

import { apiRequest } from './client';
import type { Coordinates } from '../location/riderLocation';

export interface RouteInfo {
  polyline: Coordinates[];
  // Google's real driving time/length for the route, or null when routing
  // is unavailable (missing key, quota, offline).
  durationMin: number | null;
  distanceKm: number | null;
}

export async function fetchRoute(origin: Coordinates, dest: Coordinates): Promise<RouteInfo> {
  const q = `origin_lat=${origin.latitude}&origin_lng=${origin.longitude}&dest_lat=${dest.latitude}&dest_lng=${dest.longitude}`;
  return apiRequest<RouteInfo>(`/rider/route?${q}`);
}
