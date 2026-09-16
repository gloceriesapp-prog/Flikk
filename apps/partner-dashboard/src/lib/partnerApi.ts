// Maps to backend/src/routes/partner.ts — the exact same store-owner-
// scoped API the partner mobile app already uses for Orders/Inventory/
// Payouts/Settings. Every query there is scoped server-side to the
// caller's own store (ownStoreId(req.user!.id)), never trusting a
// store_id from this client — this file just mirrors those real response
// shapes, it invents nothing.

import { apiRequest } from './api';

export interface Store {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  district: string | null;
  photo_url: string | null;
  open_time: string | null;
  close_time: string | null;
  avg_prep_minutes: number | null;
  payout_method: string | null;
  payout_upi_id: string | null;
  payout_upi_verified_name: string | null;
  payout_bank_name: string | null;
  payout_bank_account_number: string | null; // already masked server-side
  payout_bank_ifsc: string | null;
  owner_name: string | null;
  gst_number: string | null;
  shop_establishment_number: string | null;
  phone: string | null;
}

export function fetchMyStore(): Promise<Store> {
  return apiRequest('/partner/store');
}

// PATCH /partner/store deliberately drops every payout_* field server-side
// (routes/partner.ts's own note) — a payout destination is only ever set
// by a real RazorpayX verification (verifyPayoutAccount below), never by
// this generic save. Passing one here would silently no-op, not error.
export function updateMyStore(patch: Partial<Store>): Promise<Store> {
  return apiRequest('/partner/store', { method: 'PATCH', body: patch });
}

export type VerifyPayoutInput =
  | { method: 'upi'; vpa: string }
  | { method: 'bank_account'; accountNumber: string; ifsc: string; accountHolderName: string };

export interface VerifyPayoutResult {
  method: 'upi' | 'bank_account';
  vpa: string | null;
  maskedAccountNumber: string | null;
  ifsc: string | null;
  accountHolderName: string;
  accountStatus: string;
  bankName: string;
  accountType: string;
  nameMatchScore: number;
}

// A real RazorpayX Fund Account Validation, not a format check — this is
// the ONLY write path for payout_method/payout_upi_*/payout_bank_* (see
// updateMyStore's own note). Verifying one method clears the other's
// saved fields server-side.
export function verifyPayoutAccount(input: VerifyPayoutInput): Promise<VerifyPayoutResult> {
  return apiRequest('/partner/verify-payout', { method: 'POST', body: input });
}

export type OrderStatus = 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface PartnerOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price_at_order: number;
  products: { name: string; unit: string; image_url: string | null } | null;
}

export interface PartnerOrder {
  id: string;
  // Human-readable order id ("FLK-1042") — real column, backend/migrations
  // stamps it via a sequence (order_number_seq) at insert time. Use this
  // for anything customer/store-owner-facing; `id` (uuid) is only for
  // API calls/URLs.
  order_number: string;
  status: OrderStatus;
  item_total: number;
  delivery_fee: number;
  commission_amount: number;
  total: number;
  // Set once Razorpay actually captures payment — orders.ts creates the
  // order row before payment completes (see that route's own note), so a
  // freshly placed order can briefly have this still null. Null does NOT
  // mean COD; this product is Razorpay/UPI-only (no COD support exists in
  // the schema at all), it means payment capture hasn't landed yet.
  razorpay_payment_id: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  order_items: PartnerOrderItem[];
  users: { name: string | null; phone: string } | null;
  addresses: { line1: string; landmark: string | null; recipient_name: string } | null;
}

export function fetchMyOrders(): Promise<PartnerOrder[]> {
  return apiRequest('/partner/orders');
}

// Not under /partner — this is backend's shared order-status endpoint
// (backend/src/routes/orders.ts), the same one the rider/admin apps use,
// with the state machine + role/ownership checks enforced server-side.
// A store owner can only ever move an order 'placed' -> 'packed' or
// cancel it; the backend rejects anything else regardless of what's sent.
export function updateOrderStatus(id: string, status: OrderStatus, reason?: string): Promise<void> {
  return apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: { status, reason } });
}

export interface ProductVariant {
  id: string;
  unit_type: 'g' | 'kg' | 'ml' | 'l' | 'pc';
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'pc';

export interface PartnerProduct {
  id: string;
  name: string;
  local_name: string | null;
  category: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  // Kept in sync with stock_status by a DB trigger (backend/src/lib/
  // products.ts's own note) — never write this directly, write
  // stock_status and this follows.
  is_in_stock: boolean;
  stock_status: StockStatus | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  product_variants: ProductVariant[];
}

export function fetchMyProducts(): Promise<PartnerProduct[]> {
  return apiRequest('/partner/products');
}

// Per-size pricing (backend/src/lib/products.ts's own model): a product is
// ONE row with one or more *variants* — 500 g Onion at ₹30 and 1 kg Onion
// at ₹55 are two variants under one product, never two separate products.
// variants[0] becomes the default/primary listing; its price/unit get
// denormalized onto the product row itself, so this must always carry at
// least one entry — the backend rejects an empty array.
export interface VariantInput {
  unitType: UnitType;
  quantity: number;
  price: number;
  originalPrice?: number | null;
}

// Matches backend/src/lib/products.ts's ProductInput exactly (camelCase,
// stockStatus as the 3-state enum, variants required) — storeId is
// deliberately omitted here since routes/partner.ts always derives it
// server-side from the caller's own store and ignores whatever a client
// sends for it.
export interface ProductInput {
  name: string;
  category: string;
  stockStatus: StockStatus;
  imageUrl?: string | null;
  localName?: string | null;
  isVeg?: boolean;
  freshnessTag?: string | null;
  description?: string | null;
  variants: VariantInput[];
}

export function createProduct(input: ProductInput): Promise<PartnerProduct> {
  return apiRequest('/partner/products', { method: 'POST', body: input });
}

export function updateProduct(id: string, input: ProductInput): Promise<PartnerProduct> {
  return apiRequest(`/partner/products/${id}`, { method: 'PATCH', body: input });
}

export function uploadProductPhoto(base64: string): Promise<{ url: string }> {
  return apiRequest('/partner/product-photo', { method: 'POST', body: { base64 } });
}

export interface Payout {
  id: string;
  store_id: string;
  week_start: string;
  week_end: string;
  gross_amount: number;
  commission_deducted: number;
  net_payout: number;
  status: 'pending' | 'processing' | 'paid' | 'blocked' | 'failed';
  paid_at: string | null;
}

export function fetchMyPayouts(): Promise<Payout[]> {
  return apiRequest('/partner/payouts');
}
