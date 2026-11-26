import type { DeliveryRoutePoint } from '../../../api/tracking';

const METERS_PER_DEGREE = 111_320;
const ON_ROUTE_TOLERANCE_METERS = 35;
const MATCH_TIE_METERS = 5;

export interface RouteProgress {
  segment: number;
  fraction: number;
  point: DeliveryRoutePoint;
}

function longitudeScale(latitude: number) {
  return METERS_PER_DEGREE * Math.cos(latitude * Math.PI / 180);
}

export function mapDistanceMeters(a: DeliveryRoutePoint, b: DeliveryRoutePoint): number {
  return Math.hypot(
    (a.latitude - b.latitude) * METERS_PER_DEGREE,
    (a.longitude - b.longitude) * longitudeScale((a.latitude + b.latitude) / 2),
  );
}

// Project the GPS fix onto road segments. When roads cross or run close
// together, prefer the earlier match if it is almost as close.
export function matchRoute(
  route: DeliveryRoutePoint[],
  rider: DeliveryRoutePoint,
  previous?: RouteProgress,
): RouteProgress | null {
  let best: RouteProgress | null = null;
  let bestDistance = Infinity;
  const scale = longitudeScale(rider.latitude);

  for (let segment = previous?.segment ?? 0; segment < route.length - 1; segment += 1) {
    const start = route[segment]!;
    const end = route[segment + 1]!;
    const x = (start.longitude - rider.longitude) * scale;
    const y = (start.latitude - rider.latitude) * METERS_PER_DEGREE;
    const dx = (end.longitude - start.longitude) * scale;
    const dy = (end.latitude - start.latitude) * METERS_PER_DEGREE;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) continue;

    const minimum = previous?.segment === segment ? previous.fraction : 0;
    const fraction = Math.min(1, Math.max(minimum, -(x * dx + y * dy) / lengthSquared));
    const distance = Math.hypot(x + fraction * dx, y + fraction * dy);
    if (distance > ON_ROUTE_TOLERANCE_METERS || distance + MATCH_TIE_METERS >= bestDistance) continue;
    bestDistance = distance;
    best = {
      segment,
      fraction,
      point: {
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction,
      },
    };
  }

  return best;
}

export function remainingRoad(route: DeliveryRoutePoint[], progress: RouteProgress | null): DeliveryRoutePoint[] {
  if (!progress) return route;
  const ahead = route.slice(progress.segment + 1);
  if (progress.fraction === 1) return ahead;
  return [progress.point, ...ahead];
}

// Compass heading the top-down rider faces (degrees clockwise from north):
// toward the road point about 18 m ahead. Null when there is no direction
// yet (no road, or the rider is on the last point), so the map keeps the
// last heading instead of snapping back to north.
export function riderHeading(road: DeliveryRoutePoint[] | null): number | null {
  if (!road || road.length < 2) return null;
  const from = road[0]!;
  const ahead = road.find(point => mapDistanceMeters(from, point) >= 18) ?? road[road.length - 1]!;
  if (mapDistanceMeters(from, ahead) < 1) return null;
  const east = (ahead.longitude - from.longitude) * longitudeScale(from.latitude);
  const north = (ahead.latitude - from.latitude) * METERS_PER_DEGREE;
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

// Road points between two matched positions on the same route, both ends
// included. Null when `to` is not ahead of `from` (GPS jitter backwards).
export function roadBetween(route: DeliveryRoutePoint[], from: RouteProgress, to: RouteProgress): DeliveryRoutePoint[] | null {
  if (to.segment < from.segment || (to.segment === from.segment && to.fraction <= from.fraction)) return null;
  return [from.point, ...route.slice(from.segment + 1, to.segment + 1), to.point];
}

// The point a share `t` (0..1) of the way along a path, by distance, and the
// index of the segment it is on.
export function pointAlong(path: DeliveryRoutePoint[], t: number): { point: DeliveryRoutePoint; segment: number } {
  const lengths = path.slice(1).map((point, index) => mapDistanceMeters(path[index]!, point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let left = Math.min(1, Math.max(0, t)) * total;
  for (let segment = 0; segment < lengths.length; segment += 1) {
    const length = lengths[segment]!;
    if (left <= length && length > 0) {
      const f = left / length;
      const a = path[segment]!; const b = path[segment + 1]!;
      return { point: { latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f }, segment };
    }
    left -= length;
  }
  return { point: path[path.length - 1]!, segment: Math.max(0, path.length - 2) };
}

export function pathMeters(path: DeliveryRoutePoint[]): number {
  return path.slice(1).reduce((sum, point, index) => sum + mapDistanceMeters(path[index]!, point), 0);
}
