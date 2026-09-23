// Landing "do we deliver here?" check — talks to the same backend endpoint
// (GET /stores/serviceability) the customer app's own gate resolves from, so
// the badge reflects real store coverage (per-store delivery_radius_km), not a
// hardcoded keyword list. Never computes distance client-side: that would need
// every store's raw coords in the browser, which the backend deliberately
// avoids handing out (see backend/src/routes/stores.ts /nearest note).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ServiceabilityResult {
  serviceable: boolean;
  nearestDistanceKm: number | null;
}

export async function checkServiceability(
  lat: number,
  lng: number,
): Promise<ServiceabilityResult | null> {
  try {
    const res = await fetch(`${API_URL}/stores/serviceability?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return (await res.json()) as ServiceabilityResult;
  } catch {
    return null;
  }
}

// Forward-geocode a typed/suggested location string to coords (Nominatim), so
// serviceability works for manually-entered locations too, not just "detect my
// location" (which already carries GPS coords). null on failure — caller treats
// unknown as not-yet-resolved rather than a hard "unavailable".
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}
