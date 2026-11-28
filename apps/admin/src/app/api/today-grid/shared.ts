// Shared by the /api/today-grid routes: versions table access and the
// "migration not applied yet" answer. Service role, admin only.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PENDING = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);
export const isPending = (error: { code?: string } | null) => !!error && PENDING.has(error.code ?? '');
export const pendingResponse = () => NextResponse.json({ error: 'Today grid needs its database update first (migration 20261128130000).', pending: true }, { status: 503 });
export const failed = (what: string, error: { code?: string } | null) => {
  if (isPending(error)) return pendingResponse();
  console.error(`Today grid ${what} failed`, { code: error?.code });
  return NextResponse.json({ error: `Could not ${what}.` }, { status: 500 });
};

export interface VersionRow { id: number; config: unknown; created_at: string; created_by: string; note: string | null; diff: unknown; restored_from: number | null; published_at: string | null; published_by: string | null }
export const VERSION_COLUMNS = 'id, config, created_at, created_by, note, diff, restored_from, published_at, published_by';

export async function latestVersion() {
  return supabaseAdmin.from('today_grid_versions').select(VERSION_COLUMNS).order('id', { ascending: false }).limit(1).maybeSingle<VersionRow>();
}
export async function versionById(id: number) {
  return supabaseAdmin.from('today_grid_versions').select(VERSION_COLUMNS).eq('id', id).maybeSingle<VersionRow>();
}
export const versionId = (value: unknown) => (Number.isSafeInteger(value) && (value as number) > 0 ? value as number : null);
