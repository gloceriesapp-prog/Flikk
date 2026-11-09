// Product-name suggestions for Add product: master items whose name contains
// the typed text, items not yet added first. Admin-only, service role.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { CATALOGUE_ITEM_SELECT, containsPattern, toCatalogueItem, type CatalogueItemRow } from '@/lib/catalogueItems';

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const pattern = containsPattern(new URL(request.url).searchParams.get('q') ?? '');
  if (!pattern) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin.from('catalogue_item_status').select(CATALOGUE_ITEM_SELECT)
    .ilike('name', pattern).order('added').order('name').limit(8);
  if (error) {
    console.error('Catalogue search failed', error);
    return NextResponse.json({ error: 'Could not search items.' }, { status: 500 });
  }
  return NextResponse.json((data as CatalogueItemRow[]).map(toCatalogueItem));
}
