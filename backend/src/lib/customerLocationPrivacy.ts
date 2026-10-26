type DeliveryAddress = {
  line1?: string | null; landmark?: string | null; latitude?: number | null;
  longitude?: number | null; delivery_instructions?: string | null;
};

// Offer recipients have not accepted the delivery. A roughly kilometre-sized
// area supports the preview; the exact doorway and instructions stay private.
export function approximateOfferAddress(value: unknown): DeliveryAddress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const address = value as DeliveryAddress;
  const latitude = address.latitude;
  const longitude = address.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { line1: 'Approximate delivery area', landmark: null,
    latitude: Math.round(latitude * 100) / 100, longitude: Math.round(longitude * 100) / 100 };
}

const ACTIVE_DELIVERY_STATUSES = new Set(['placed', 'packed', 'out_for_delivery']);
export function withoutFinishedDeliveryAddress<T extends { status: string; addresses?: unknown }>(row: T): T {
  return ACTIVE_DELIVERY_STATUSES.has(row.status) ? row : { ...row, addresses: null };
}
