// GET /delivery-settings (backend/src/routes/deliverySettings.ts) — the
// single admin-editable delivery-fee config (apps/admin's Settings page,
// public.delivery_settings). Response is already camelCase (mapped
// server-side), unlike most other feeds in this app that map snake_case
// themselves — this endpoint only ever has one real consumer shape, no
// Product-style mapping layer needed.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventoryCacheSync } from '../screens/home/content/inventoryCache';
import { DEFAULT_DELIVERY_MINUTES, deliveryMinutes } from '../utils/estimateDelivery';
import { deliveryWindowFor, type CategoryDeliveryWindow, type DeliveryWindow } from '../utils/deliveryWindow';
import { apiRequest } from './client';
import { subscribePublicContentCache } from '../screens/home/content/publicContentCache';

export interface DeliverySettings {
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
  estimatedDeliveryMinutes: number;
  // migration 112 — platform ordering window, IST minutes since midnight.
  // Optional: an older backend omits them and utils/operatingHours falls
  // back to 6:00 AM-10:30 PM.
  orderingOpensMinute?: number;
  orderingClosesMinute?: number;
  // Slower categories and their range (utils/deliveryWindow.ts). Absent on
  // an older backend: every category uses estimatedDeliveryMinutes.
  categoryWindows?: CategoryDeliveryWindow[];
}

export async function fetchDeliverySettings(): Promise<DeliverySettings> {
  const settings = await apiRequest<DeliverySettings>('/delivery-settings', { auth: false });
  return { ...settings, estimatedDeliveryMinutes: deliveryMinutes(settings.estimatedDeliveryMinutes) };
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
  estimatedDeliveryMinutes: DEFAULT_DELIVERY_MINUTES,
  orderingOpensMinute: 360,
  orderingClosesMinute: 1350,
};

// One query key for all fees and estimates. Root sync handles invalidation.
export function useDeliverySettings() {
  return useQuery({
    queryKey: ['delivery-settings'],
    queryFn: fetchDeliverySettings,
    staleTime: 30_000,
  });
}

// All browsing labels observe the same cached setting, without local timers.
export function useDeliveryEstimateMinutes(): number {
  const { data = DEFAULT_DELIVERY_SETTINGS } = useDeliverySettings();
  return data.estimatedDeliveryMinutes;
}

const NO_WINDOWS: CategoryDeliveryWindow[] = [];
// Lifted with useDeliveryEstimateMinutes by product sections, so cards get
// their category's window without a subscription each.
export function useCategoryWindows(): CategoryDeliveryWindow[] {
  const { data } = useDeliverySettings();
  return data?.categoryWindows ?? NO_WINDOWS;
}

// Delivery window for products of these categories (a product card passes
// its one category; the cart passes every line's).
export function useDeliveryWindow(categories: (string | null | undefined)[]): DeliveryWindow {
  const { data = DEFAULT_DELIVERY_SETTINGS } = useDeliverySettings();
  return deliveryWindowFor(categories, data.estimatedDeliveryMinutes, data.categoryWindows);
}

// Mount once in RootNavigator. Realtime updates and its single foreground
// fallback refresh every observer, including product cards, without N timers.
export function useDeliverySettingsSync() {
  const client = useQueryClient();
  useDeliverySettings();
  useInventoryCacheSync();
  useEffect(() => subscribePublicContentCache(client), [client]);
}
