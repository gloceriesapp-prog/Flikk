import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';
import { readCheckoutCatalog } from './checkoutCatalog.js';
import { parseCheckoutItems } from './checkoutItems.js';
import { checkoutAvailability, type EligibilityAddress, type EligibilityProduct, type EligibilityStore } from './checkoutEligibility.js';

export async function loadCheckoutAvailability(input: unknown, customerId: string, addressId?: string) {
  if (addressId != null && (typeof addressId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(addressId))) {
    throw new AppError(400, 'INVALID_ADDRESS', 'Choose a valid saved address.');
  }
  const items = parseCheckoutItems(input);
  const products = await readCheckoutCatalog(items) as EligibilityProduct[];
  const storeIds = [...new Set(products.map((p) => p.store_id))];
  const [addressResult, storeResult, zoneResult] = await Promise.all([
    addressId ? supabase.from('addresses').select('id, zone_id, latitude, longitude').eq('id', addressId)
      .eq('user_id', customerId).is('deleted_at', null).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from('stores').select('id, zone_id, is_active, open_time, close_time, lat, lng, delivery_radius_km').in('id', storeIds),
    supabase.from('zones').select('id').eq('is_active', true),
  ]);
  if (addressResult.error) throw addressResult.error;
  if (storeResult.error) throw storeResult.error;
  if (zoneResult.error) throw zoneResult.error;
  if (addressId && !addressResult.data) throw new AppError(403, 'ADDRESS_UNAVAILABLE', 'Choose one of your saved delivery addresses.');
  const address = addressResult.data as EligibilityAddress | null;
  return { ...checkoutAvailability(items, products, storeResult.data as EligibilityStore[], address,
    new Set((zoneResult.data ?? []).map((zone) => zone.id))), address, products };
}
export async function requireCheckoutEligibilitySnapshot(input: unknown, customerId: string, addressId?: string) {
  const result = await loadCheckoutAvailability(input, customerId, addressId);
  if (!result.eligible) {
    const issue = result.lines.find((line) => !line.eligible) ?? result.issues[0]!;
    throw new AppError(409, 'CHECKOUT_INELIGIBLE', issue.message ?? 'Some items cannot be ordered. Review your cart.');
  }
  return { address: result.address!, products: result.products };
}

// Preserve the address-only contract for other callers. The quote pipeline
// consumes the validated catalogue too, within this request only.
export async function requireCheckoutEligibility(input: unknown, customerId: string, addressId?: string) {
  return (await requireCheckoutEligibilitySnapshot(input, customerId, addressId)).address;
}
