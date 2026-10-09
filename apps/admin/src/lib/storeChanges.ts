// Store profile change requests (migration 114) — shared by the admin API
// routes under app/api/store-changes and the review UI.
import type { StoreChangeRequest } from './types';

export const STORE_CHANGE_SELECT = 'id, store_id, changes, previous, status, review_reason, created_at, reviewed_at, stores(name)';

export interface StoreChangeRow {
  id: string;
  store_id: string;
  changes: Record<string, unknown>;
  previous: Record<string, unknown>;
  status: StoreChangeRequest['status'];
  review_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  stores: { name: string } | null;
}

export function mapStoreChange(row: StoreChangeRow): StoreChangeRequest {
  return {
    id: row.id,
    storeId: row.store_id,
    storeName: row.stores?.name ?? 'Store',
    changes: row.changes ?? {},
    previous: row.previous ?? {},
    status: row.status,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export const STORE_CHANGE_LABELS: Record<string, string> = {
  name: 'Store name',
  category: 'Category',
  district: 'District',
  address_line: 'Address (from map pin)',
  manual_address: 'Address description',
  lat: 'Latitude',
  lng: 'Longitude',
  drug_license_number: 'Drug licence',
};

export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
