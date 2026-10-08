// Maps to backend/src/routes/partner.ts — the exact same store-owner-
// scoped API the partner mobile app already uses for Orders/Inventory/
// Payouts/Settings. Every query there is scoped server-side to the
// caller's own store (ownStoreId(req.user!.id)), never trusting a
// store_id from this client — this file just mirrors those real response
// shapes, it invents nothing.

import { apiRequest } from './api';

export interface Store {
  access_role?: 'owner' | 'manager';
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  // Admin suspension (migration 110) — while set the store cannot reopen;
  // PATCH /partner/store answers 409 STORE_SUSPENDED.
  admin_suspended?: boolean;
  suspended_reason?: string | null;
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
  // KYC identifiers — PATCH /partner/store validates format (isValidFssai/
  // isValidPanFormat) server-side before writing. Real columns, same store row.
  fssai_number: string | null;
  pan_number: string | null;
  phone: string | null;
}

export function fetchMyStore(): Promise<Store> {
  return apiRequest('/partner/store');
}

// PATCH /partner/store drops every payout_* field server-side — payout
// details are only written through PUT /partner/payout-account
// (backend/PAYOUTS.md), never by this generic save.
export function updateMyStore(patch: Partial<Store>): Promise<Store> {
  return apiRequest('/partner/store', { method: 'PATCH', body: patch });
}

// Web only sets a UPI ID: bank accounts need a cancelled-cheque photo, which
// the partner mobile app uploads. Details are saved as unverified; the
// founder confirms the name when sending the first manual payout.
export interface PayoutAccount {
  method: 'upi' | 'bank' | null;
  upiId: string | null;
  accountHolderName: string | null;
  accountLast4: string | null;
  ifsc: string | null;
  bankName: string | null;
  hasProof: boolean;
  status: 'unverified' | 'verified';
  verifiedName: string | null;
}

export function saveUpiPayoutAccount(upiId: string): Promise<PayoutAccount> {
  return apiRequest('/partner/payout-account', { method: 'PUT', body: { method: 'upi', upiId } });
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
  // Set once the payment provider (Cashfree) actually captures payment — orders.ts creates the
  // order row before payment completes (see that route's own note), so a
  // freshly placed order can briefly have this still null. Null does NOT
  // mean COD; this product is online-payment-only (no COD support exists in
  // the schema at all), it means payment capture hasn't landed yet.
  provider_payment_id: string | null;
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
  // Counted packs of this size on hand; null/absent = never counted.
  stock_quantity?: number | null;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'pc';

// Real on-hand count is what the partner types; stock_status is DERIVED from
// it so the number and the label can never disagree. Mirror of backend/src/
// lib/products.ts deriveStockStatus — keep the threshold in sync.
export const LOW_STOCK_THRESHOLD = 10;
export function deriveStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

export interface PartnerProduct {
  id: string;
  name: string;
  local_name: string | null;
  category: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  // A new photo the partner submitted for an already-approved product,
  // awaiting admin approval. The LIVE image customers see stays image_url
  // until admin approves — this is only "under review". Null when there's
  // nothing pending. fetchMyProducts returns the row as-is, so this flows
  // through with no explicit mapping to add.
  pending_image_url: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  // Kept in sync with stock_status by a DB trigger (backend/src/lib/
  // products.ts's own note) — never write this directly, write
  // stock_status and this follows.
  is_in_stock: boolean;
  stock_status: StockStatus | null;
  // Real on-hand count (migration adds it, default 0). Legacy rows never
  // edited since the migration read 0 here while still flagged in_stock —
  // InventoryTable's StockCell treats that pairing as "not really set".
  stock_quantity: number | null;
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
  // Existing pack id when editing, so the backend updates that pack in
  // place and keeps its stock instead of replacing it.
  id?: string;
  unitType: UnitType;
  quantity: number;
  price: number;
  originalPrice?: number | null;
  // Counted packs of this size on hand. The backend sums the packs into the
  // product's stock and turns on tracking (checkout needs both).
  stockQuantity?: number;
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
  // Real on-hand count. Sent alongside stockStatus (which is derived from it
  // client-side) — the backend re-derives from this when present, so it's
  // the value that actually decides the stored status.
  stockQuantity?: number;
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

// PATCH is a partial update — fields left out of `input` are not changed.
export function updateProduct(id: string, input: ProductInput): Promise<PartnerProduct> {
  return apiRequest(`/partner/products/${id}`, { method: 'PATCH', body: input });
}

export function uploadProductPhoto(base64: string): Promise<{ url: string }> {
  return apiRequest('/partner/product-photo', { method: 'POST', body: { base64 } });
}

export interface Payout {
  payment_note?: string | null;
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

// GET /partner/reviews is RLS-scoped to the caller's own store. owner_reply/
// owner_replied_at (migration 053) hold the store owner's public response —
// null until they reply. Written via replyToReview (PATCH), never by the
// customer.
export interface PartnerReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  owner_reply: string | null;
  owner_replied_at: string | null;
  users: { name: string | null } | null;
  orders: { order_number: string } | null;
}

export function fetchMyReviews(): Promise<PartnerReview[]> {
  return apiRequest('/partner/reviews');
}

// Reply-only — the backend allowlist ignores everything but `reply`, and
// scopes the write to the caller's own store. Empty string clears the reply.
export function replyToReview(id: string, reply: string): Promise<PartnerReview> {
  return apiRequest(`/partner/reviews/${id}`, { method: 'PATCH', body: { reply } });
}
