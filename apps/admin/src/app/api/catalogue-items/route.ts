// Pending items: the per-section progress summary plus one page of items,
// filtered by status (pending / added / needs category), section and search.
// Admin-only, service role.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { CATALOGUE_ITEM_SELECT, containsPattern, toCatalogueItem, type CatalogueItemRow, type CatalogueProgressRow } from '@/lib/catalogueItems';

const PAGE_SIZE = 50;
const STATUSES = ['pending', 'added', 'needs-category'] as const;

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const status = STATUSES.find((s) => s === params.get('status')) ?? 'pending';
  const section = params.get('section')?.trim() || null;
  const page = Math.max(0, Math.min(10_000, Number.parseInt(params.get('page') ?? '0', 10) || 0));
  const pattern = containsPattern(params.get('q') ?? '');

  let query = supabaseAdmin.from('catalogue_item_status').select(CATALOGUE_ITEM_SELECT, { count: 'exact' });
  if (status === 'needs-category') query = query.is('sub_category_id', null);
  else query = query.eq('added', status === 'added').not('sub_category_id', 'is', null);
  if (section && status !== 'needs-category') query = query.eq('section_name', section);
  if (pattern) query = query.ilike('name', pattern);

  const [{ data, count, error }, progress] = await Promise.all([
    query.order('section_name').order('category_name').order('sub_category_name').order('name')
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1),
    supabaseAdmin.rpc('catalogue_progress'),
  ]);
  if (error || progress.error) {
    console.error('Catalogue items read failed', error ?? progress.error);
    return NextResponse.json({ error: 'Could not load items.' }, { status: 500 });
  }
  const summary: CatalogueProgressRow[] = (progress.data as { section_name: string; total: number; added: number }[])
    .map((r) => ({ sectionName: r.section_name, total: Number(r.total), added: Number(r.added) }));
  return NextResponse.json({
    items: (data as CatalogueItemRow[]).map(toCatalogueItem), total: count ?? 0, page, pageSize: PAGE_SIZE, summary,
  });
}
