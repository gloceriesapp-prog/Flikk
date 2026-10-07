// Explicit public contract: newly added merchant/KYC/payout columns stay private.
export const PUBLIC_STORE_FIELDS = [
  'id', 'zone_id', 'name', 'category', 'rating', 'avg_prep_minutes', 'is_active',
  'open_time', 'close_time', 'lat', 'lng', 'delivery_radius_km', 'photo_url',
  'address_line', 'manual_address', 'district', 'city', 'fssai_number', 'created_at',
] as const;

export function publicStore(row: Record<string, unknown>) {
  return Object.fromEntries(PUBLIC_STORE_FIELDS.filter(key => key in row).map(key => [key, row[key]]));
}
