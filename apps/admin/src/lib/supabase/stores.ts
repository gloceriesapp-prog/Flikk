// Browser-safe store DTO mapping. Reads use authenticated admin routes;
// server-side detail reads use the service-role client after the admin gate.

import type { Store } from '../types';

export interface StoreRow {
  manual_address: string | null;
  udyam_number: string | null;
  avg_prep_minutes: number | null;
  id: string;
  name: string;
  category: string;
  district: string;
  is_active: boolean;
  admin_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
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
  'id, manual_address, udyam_number, avg_prep_minutes, name, category, district, is_active, admin_suspended, suspended_reason, suspended_at, created_at, phone, open_time, close_time, owner_name, address_line, city, state, country, photo_url, fssai_number, shop_establishment_number, pan_number, aadhaar_last4, bank_name, bank_account_last4, turnover_exceeds_gst_threshold, gst_number, drug_license_number, lat, lng, delivery_radius_km';

export function mapRowToStore(row: StoreRow): Store {
  return {
    id: row.id,
    manualAddress: row.manual_address ?? '',
    udyamNumber: row.udyam_number ?? '',
    avgPrepMinutes: row.avg_prep_minutes ?? undefined,
    name: row.name,
    category: row.category,
    zone: 'Kaup, Udupi',
    district: row.district,
    phone: row.phone ?? '',
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    isActive: row.is_active,
    adminSuspended: row.admin_suspended ?? false,
    suspendedReason: row.suspended_reason ?? null,
    suspendedAt: row.suspended_at ?? null,
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
  const response = await fetch('/api/stores', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'Could not load stores.');
  return body as Store[];
}
