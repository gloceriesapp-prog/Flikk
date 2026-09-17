// GET /delivery-settings (backend/src/routes/deliverySettings.ts) — the
// single admin-editable delivery-fee config (apps/admin's Settings page,
// public.delivery_settings). Response is already camelCase (mapped
// server-side), unlike most other feeds in this app that map snake_case
// themselves — this endpoint only ever has one real consumer shape, no
// Product-style mapping layer needed.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';

export interface DeliverySettings {
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
}

export function fetchDeliverySettings(): Promise<DeliverySettings> {
  return apiRequest('/delivery-settings', { auth: false });
}

// Free delivery OFF, flat ₹25 delivery + ₹5 handling — matches the
// migration's own seeded row (029/030_delivery_settings*.sql) exactly, so
// a cold cache/failed fetch reads the same as the real default rather
// than some other guessed number.
export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  flatDeliveryFee: 25,
  freeDeliveryEnabled: false,
  freeDeliveryThreshold: 199,
  handlingFee: 5,
};

// Shared by every screen/component that needs the real delivery fee
// (BillDetailsCard, CheckoutScreen, ReceiptCard, FreeDeliveryBar,
// FreeDeliveryUnlockBanner) — one query key, one cache entry, so they can
// never show different numbers for the same real setting. 10-minute
// staleTime: this changes only when a founder edits it in admin, not on
// every cart interaction, so there's no reason to refetch aggressively.
export function useDeliverySettings() {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: fetchDeliverySettings,
    staleTime: 10 * 60 * 1000,
  });
}
