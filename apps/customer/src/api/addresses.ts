// Maps to GET/POST /addresses, PATCH /addresses/:id/default, DELETE
// /addresses/:id (backend/src/routes/addresses.ts) — the real address book.
// A customer's first order collects one of these for real; every order
// after that reuses it automatically (CheckoutScreen's own note).

import { apiRequest } from './client';

export interface ApiAddress {
  id: string;
  label: string;
  line1: string;
  landmark: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  delivery_instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface CreateAddressInput {
  label?: string;
  line1: string;
  landmark?: string;
  recipient_name: string;
  recipient_phone?: string;
  delivery_instructions?: string;
  latitude: number;
  longitude: number;
}

export function fetchAddresses(): Promise<ApiAddress[]> {
  return apiRequest('/addresses');
}

export function createAddress(input: CreateAddressInput): Promise<ApiAddress> {
  return apiRequest('/addresses', { method: 'POST', body: input });
}

export function setDefaultAddress(id: string): Promise<ApiAddress> {
  return apiRequest(`/addresses/${id}/default`, { method: 'PATCH' });
}

export function deleteAddress(id: string): Promise<{ ok: true }> {
  return apiRequest(`/addresses/${id}`, { method: 'DELETE' });
}
