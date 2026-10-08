import { apiRequest } from './client';
import type { CreateOrderItem } from './orders';

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
  }[];
  bill: {
    storeCount: number;
    itemTotal: number;
    originalItemTotal: number;
    baseDeliveryFee: number;
    additionalShopFee: number;
    deliveryFee: number;
    handlingFee: number;
    discountAmount: number;
    total: number;
  };
  // Platform minimum order on the item subtotal (admin Checkout settings).
  // shortfall > 0: the server refuses the order until more is added.
  // Absent from older servers.
  minimumOrder?: { value: number; shortfall: number };
}
export function fetchCheckoutQuote(items: CreateOrderItem[], promoCode?: string, addressId?: string): Promise<CheckoutQuote> {
  return apiRequest('/checkout/quote', { method: 'POST', body: { items, promo_code: promoCode, address_id: addressId } });
}

export interface CartAvailability {
  eligible: boolean;
  issues: { code: string; message: string }[];
  lines: { product_id: string; variant_id: string | null; quantity: number;
    eligible: boolean; status: string; message: string | null; availableQuantity: number | null }[];
}
export function fetchCartAvailability(items: CreateOrderItem[], addressId?: string): Promise<CartAvailability> {
  return apiRequest('/checkout/availability', { method: 'POST', body: { items, address_id: addressId } });
}
