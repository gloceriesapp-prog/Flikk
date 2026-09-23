// Maps between the real public.stores row and this dashboard's Store type
// (lib/types.ts), plus the one client-side read Stores needs (fetchStores —
// covered by the public stores_read_active RLS policy, no service-role key
// needed here). Writes live in app/api/stores/* instead, same rationale as
// lib/supabase/products.ts's own note.

import { supabase } from './client';
import type { Store } from '../types';

export interface StoreRow {
  id: string;
  name: string;
  category: string;
  district: string;
  is_active: boolean;
  created_at: string;
  phone: string | null;
  open_time: string | null;
  close_time: string | null;
  owner_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  photo_url: string | null;
  fssai_number: string | null;
  shop_establishment_number: string | null;
  pan_number: string | null;
  aadhaar_last4: string | null;
  bank_name: string | null;
  bank_account_last4: string | null;
  turnover_exceeds_gst_threshold: boolean;
  gst_number: string | null;
  drug_license_number: string | null;
  lat: number | null;
  lng: number | null;
  delivery_radius_km: number | null;
}

export const STORE_SELECT =
  'id, name, category, district, is_active, created_at, phone, open_time, close_time, owner_name, address_line, city, state, country, photo_url, fssai_number, shop_establishment_number, pan_number, aadhaar_last4, bank_name, bank_account_last4, turnover_exceeds_gst_threshold, gst_number, drug_license_number, lat, lng, delivery_radius_km';

export function mapRowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    zone: 'Kaup, Udupi',
    district: row.district,
    phone: row.phone ?? '',
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    isActive: row.is_active,
    ownerName: row.owner_name ?? '',
    joinedAt: new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    addressLine: row.address_line ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    country: row.country ?? 'India',
    photoUrl: row.photo_url ?? undefined,
    fssaiNumber: row.fssai_number ?? '',
    shopEstablishmentNumber: row.shop_establishment_number ?? '',
    panNumber: row.pan_number ?? '',
    aadhaarLast4: row.aadhaar_last4 ?? '',
    bankName: row.bank_name ?? '',
    bankAccountLast4: row.bank_account_last4 ?? '',
    turnoverExceedsGstThreshold: row.turnover_exceeds_gst_threshold,
    gstNumber: row.gst_number ?? undefined,
    drugLicenseNumber: row.drug_license_number ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    deliveryRadiusKm: row.delivery_radius_km ?? undefined,
  };
}

export async function fetchStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select(STORE_SELECT).order('name');
  if (error) throw error;
  return (data as unknown as StoreRow[]).map(mapRowToStore);
}

export async function fetchStore(id: string): Promise<Store | null> {
  const { data, error } = await supabase.from('stores').select(STORE_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRowToStore(data as unknown as StoreRow) : null;
}
