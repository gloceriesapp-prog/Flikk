import { distanceKm } from '../utils/geo.js';
import type { CartItem } from './orderValidation.js';
import type { CheckoutProduct } from './checkoutItems.js';

export const DEFAULT_CHECKOUT_RADIUS_KM = 12;
export const PLATFORM_OPEN_MINUTE = 6 * 60;
export const PLATFORM_CLOSE_MINUTE = 22 * 60 + 30;
export function istMinutes(date = new Date()): number {
  const shifted = new Date(date.getTime() + 330 * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}
export function platformIsOpen(date = new Date()): boolean {
  const minute = istMinutes(date);
  return minute >= PLATFORM_OPEN_MINUTE && minute < PLATFORM_CLOSE_MINUTE;
}
export function parseStoreTime(value: string | null): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) hour = hour % 12 + (period === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}
export function storeIsOpen(store: EligibilityStore, date = new Date()): boolean {
  if (!store.is_active) return false;
  // No schedule uses the owner's open/closed toggle. Partial/invalid hours
  // fail closed; equal start/end explicitly means 24 hours.
  if (!store.open_time && !store.close_time) return true;
  const open = parseStoreTime(store.open_time);
  const close = parseStoreTime(store.close_time);
  if (open == null || close == null) return false;
  const minute = istMinutes(date);
  return open === close || (open < close ? minute >= open && minute < close : minute >= open || minute < close);
}
export interface EligibilityStore {
  id: string; zone_id: string; is_active: boolean;
  open_time: string | null; close_time: string | null;
  lat: number | null; lng: number | null; delivery_radius_km: number | null;
}
export interface EligibilityProduct extends CheckoutProduct {
  approval_status: string;
  stock_status: string;
  stock_quantity: number | null;
  stock_tracking_enabled?: boolean;
}
export interface EligibilityAddress {
  id: string; zone_id: string; latitude: number | null; longitude: number | null;
}
export interface AvailabilityIssue { code: string; message: string }
export interface LineAvailability {
  product_id: string; variant_id: string | null; quantity: number;
  eligible: boolean; status: string; message: string | null; availableQuantity: number | null;
}
export function validPin(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}
export function checkoutAvailability(items: CartItem[], products: EligibilityProduct[], stores: EligibilityStore[],
  address: EligibilityAddress | null, activeZoneIds: Set<string>, date = new Date()) {
  const productById = new Map(products.map((p) => [p.id, p]));
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const requested = new Map<string, number>();
  for (const item of items) requested.set(item.product_id, (requested.get(item.product_id) ?? 0) + item.quantity);
  const issues: AvailabilityIssue[] = [];
  if (!platformIsOpen(date)) issues.push({ code: 'PLATFORM_CLOSED', message: 'Ordering is closed. We reopen at 6:00 AM IST.' });
  if (!address) issues.push({ code: 'ADDRESS_REQUIRED', message: 'Choose a saved delivery address to continue.' });
  else if (!validPin(address.latitude, address.longitude)) issues.push({ code: 'ADDRESS_PIN_REQUIRED', message: 'Add a map pin to your delivery address.' });
  else if (!activeZoneIds.has(address.zone_id)) issues.push({ code: 'ZONE_UNAVAILABLE', message: 'Delivery is unavailable in this area.' });
  const lines: LineAvailability[] = items.map((item) => {
    const p = productById.get(item.product_id);
    const store = p ? storeById.get(p.store_id) : undefined;
    const tracked = p?.stock_tracking_enabled === true;
    const available = tracked && p?.stock_quantity != null ? Number(p.stock_quantity) : null;
    let issue: AvailabilityIssue | null = null;
    if (!p || p.approval_status !== 'approved') issue = { code: 'PRODUCT_UNAVAILABLE', message: 'This product is unavailable.' };
    else if (p.stock_tracking_enabled === false) issue = { code: 'STOCK_UNCONFIRMED', message: 'The shop is updating stock. Try again shortly.' };
    else if (!p.is_in_stock || p.stock_status === 'out_of_stock' || (tracked && (!Number.isInteger(available) || available! <= 0)))
      issue = { code: 'OUT_OF_STOCK', message: 'Out of stock' };
    else if (available != null && (requested.get(p.id) ?? 0) > available)
      issue = { code: 'INSUFFICIENT_STOCK', message: `Only ${available} available. Reduce the quantity.` };
    else if ((item.variant_id && !p.product_variants.some((v) => v.id === item.variant_id))
      || (!item.variant_id && p.product_variants.length > 1 && !p.product_variants.some((v) => v.is_default)))
      issue = { code: 'PACK_UNAVAILABLE', message: 'This pack is unavailable. Choose another pack.' };
    else if (item.variant_id && p.product_variants.some(v => v.id === item.variant_id && (v.stock_quantity === 0 || (p.product_variants.length > 1 && v.stock_quantity == null))))
      issue = { code: 'OUT_OF_STOCK', message: 'This pack is out of stock or stock is being updated.' };
    else if (item.variant_id && p.product_variants.some(v => v.id === item.variant_id && v.stock_quantity != null && v.stock_quantity < item.quantity))
      issue = { code: 'INSUFFICIENT_STOCK', message: 'Reduce the quantity of this pack.' };
    else if (!store || !activeZoneIds.has(store.zone_id)) issue = { code: 'STORE_UNAVAILABLE', message: 'This shop is unavailable.' };
    else if (!storeIsOpen(store, date)) issue = { code: 'STORE_CLOSED', message: 'Shop closed' };
    else if (!validPin(store.lat, store.lng)) issue = { code: 'STORE_UNAVAILABLE', message: 'Delivery from this shop is unavailable.' };
    else if (address && validPin(address.latitude, address.longitude)) {
      const radius = store.delivery_radius_km ?? DEFAULT_CHECKOUT_RADIUS_KM;
      if (store.zone_id !== address.zone_id || !Number.isFinite(radius) || radius <= 0
        || distanceKm({ latitude: address.latitude!, longitude: address.longitude! }, { latitude: store.lat!, longitude: store.lng! }) > radius)
        issue = { code: 'OUT_OF_RANGE', message: 'This shop cannot deliver to your address.' };
    }
    return { product_id: item.product_id, variant_id: item.variant_id ?? null, quantity: item.quantity,
      eligible: !issue, status: issue?.code ?? 'AVAILABLE', message: issue?.message ?? null, availableQuantity: available };
  });
  return { eligible: issues.length === 0 && lines.every((line) => line.eligible), issues, lines };
}
