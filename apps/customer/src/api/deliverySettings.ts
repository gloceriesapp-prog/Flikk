// GET /delivery-settings (backend/src/routes/deliverySettings.ts) — the
// single admin-editable delivery-fee config (apps/admin's Settings page,
// public.delivery_settings). Response is already camelCase (mapped
// server-side), unlike most other feeds in this app that map snake_case
// themselves — this endpoint only ever has one real consumer shape, no
// Product-style mapping layer needed.

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInventoryCacheSync } from '../screens/home/content/inventoryCache';
import { subscribeHomeContent } from '../screens/home/content/realtime';
import { DEFAULT_DELIVERY_MINUTES, deliveryMinutes } from '../utils/estimateDelivery';
import { apiRequest } from './client';

export interface DeliverySettings {
  flatDeliveryFee: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryThreshold: number;
  handlingFee: number;
  estimatedDeliveryMinutes: number;
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

// Mount once in RootNavigator. Realtime updates and its single foreground
// fallback refresh every observer, including product cards, without N timers.
export function useDeliverySettingsSync() {
  const client = useQueryClient();
  useDeliverySettings();
  useInventoryCacheSync();
  useEffect(() => subscribeHomeContent((event) => {
    if (event === 'content') void client.invalidateQueries({ queryKey: ['inventory-zone'] });
    if (event === 'settings') void client.invalidateQueries({ queryKey: ['delivery-settings'] });
  }), [client]);
}
