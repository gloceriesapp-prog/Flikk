import type { Coordinates } from '../../../location/riderLocation';

// The road still ahead: from the rider to the destination, skipping the
// part already ridden (the route was worked out from where the rider was).
// Picks the nearest stretch of road (segment), not the nearest point, so a
// corner just ahead of the rider is never cut.
export function roadAhead(route: Coordinates[], rider: Coordinates): Coordinates[] {
  if (route.length < 2) return [rider, ...route];
  const scale = Math.cos(rider.latitude * Math.PI / 180);
  let segment = 0;
  let best = Infinity;
  for (let i = 0; i < route.length - 1; i += 1) {
    const ax = (route[i]!.longitude - rider.longitude) * scale; const ay = route[i]!.latitude - rider.latitude;
    const dx = (route[i + 1]!.longitude - route[i]!.longitude) * scale; const dy = route[i + 1]!.latitude - route[i]!.latitude;
    const length = dx * dx + dy * dy;
    const t = length ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / length)) : 0;
    const distance = (ax + t * dx) ** 2 + (ay + t * dy) ** 2;
    if (distance < best) { best = distance; segment = i; }
  }
  return [rider, ...route.slice(segment + 1)];
}
