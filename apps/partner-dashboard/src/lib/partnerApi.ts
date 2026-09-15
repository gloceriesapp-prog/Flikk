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

export function updateMyStore(patch: Partial<Store>): Promise<Store> {
  return apiRequest('/partner/store', { method: 'PATCH', body: patch });
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
  status: OrderStatus;
  item_total: number;
  delivery_fee: number;
  commission_amount: number;
  total: number;
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

export interface ProductVariant {
  id: string;
  unit_type: 'g' | 'kg' | 'ml' | 'l' | 'pc';
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
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
  is_veg: boolean;
  freshness_tag: string | null;
  is_in_stock: boolean;
  stock_status: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  product_variants: ProductVariant[];
}

export function fetchMyProducts(): Promise<PartnerProduct[]> {
  return apiRequest('/partner/products');
}

export interface ProductInput {
  name: string;
  local_name?: string;
  category: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  is_veg?: boolean;
  freshness_tag?: string;
  is_in_stock?: boolean;
  variants?: { unit_type: string; quantity: number; price: number; original_price?: number; is_default: boolean }[];
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
