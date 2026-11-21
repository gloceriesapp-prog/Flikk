// Latest cut-out job per product, for the inventory page to show
// "Cleaning photo…" after a save and swap in the cleaned photo when ready.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',').filter((id) => UUID.test(id)).slice(0, 50);
  if (!ids.length) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin.from('product_image_jobs')
    .select('product_id, status, reason, created_at').in('product_id', ids).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load photo status.' }, { status: 500 });
  const latest = new Map<string, { productId: string; status: string; reason: string | null }>();
  for (const row of data ?? []) {
    if (!latest.has(row.product_id)) latest.set(row.product_id, { productId: row.product_id, status: row.status, reason: row.reason });
  }
  return NextResponse.json([...latest.values()]);
}
