import { apiRequest } from './client';
import type { CreateOrderItem } from './orders';
import type { CutSize, Serving } from '../store/cartIdentity';

export interface CheckoutQuote {
  token: string;
  version: string;
  expiresAt: number;
  promoCodeId: string | null;
  items: {
    product_id: string;
    variant_id: string | null;
    store_id: string;
    quantity: number;
    unit_price_at_order: number;
    unit_at_order: string;
    variant_mrp_at_order: number;
    cut_size?: CutSize | null;
    option_id?: string | null;
    serving?: Serving | null;
    // Server-side: this product reached its bulk quantity, so the order is a
    // bulk order the store confirms (with a longer response window).
    bulk?: boolean;
  }[];
  bill: {
    storeCount: number;
    itemTotal: number;
    originalItemTotal: number;
    baseDeliveryFee: number;
    additionalShopFee: number;
    deliveryFee: number;
    handlingFee: number;
    originalBaseDeliveryFee?: number;
    originalHandlingFee?: number;
    deliveryFeeShowFree?: boolean;
    handlingFeeShowFree?: boolean;
    discountAmount: number;
    // Rider tip inside total (absent from older servers).
    tipAmount?: number;
    total: number;
  };
  // Platform minimum order on the item subtotal (admin Checkout settings).
  // shortfall > 0: the server refuses the order until more is added.
  // Absent from older servers.
  minimumOrder?: { value: number; shortfall: number };
  // Whole cart is milk/bread/fish… from one shop: the morning slots it can
  // be booked into instead of quick delivery. Absent from older servers.
  morningSlots?: { id: string; label: string; starts_minute: number; ends_minute: number }[];
}
export function fetchCheckoutQuote(items: CreateOrderItem[], promoCode?: string, addressId?: string, tipAmount = 0): Promise<CheckoutQuote> {
  return apiRequest('/checkout/quote', { method: 'POST', body: { items, promo_code: promoCode, address_id: addressId, ...(tipAmount > 0 ? { tip_amount: tipAmount } : {}) } });
}

// Guest cart (not signed in): the server prices the cart for the browsing
// pin (POST /checkout/estimate) with no promo or tip. Shaped like a quote so
// the bill card renders it, but with no token it can never place an order.
export async function fetchCheckoutEstimate(items: CreateOrderItem[], pin: { latitude: number; longitude: number }): Promise<CheckoutQuote> {
  const estimate = await apiRequest<Pick<CheckoutQuote, 'items' | 'bill' | 'minimumOrder'>>('/checkout/estimate', {
    method: 'POST', auth: false, body: { items, lat: pin.latitude, lng: pin.longitude },
  });
  return { ...estimate, token: '', version: '', expiresAt: 0, promoCodeId: null };
}

export interface CartAvailability {
  eligible: boolean;
  issues: { code: string; message: string }[];
  lines: { product_id: string; variant_id: string | null; option_id?: string | null; cut_size?: CutSize | null; serving?: Serving | null; quantity: number;
    eligible: boolean; status: string; message: string | null; availableQuantity: number | null }[];
}
export function fetchCartAvailability(items: CreateOrderItem[], addressId?: string): Promise<CartAvailability> {
  return apiRequest('/checkout/availability', { method: 'POST', body: { items, address_id: addressId } });
}
