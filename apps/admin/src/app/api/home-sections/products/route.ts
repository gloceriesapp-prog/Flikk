// Home Sections picker: the hand-picked products of one section, in order.
// PUT { key, productIds } replaces the list in one transaction
// (admin_set_home_section_products, migration 20261027150000).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { acceptsPins, parseProductIds, pinErrorStatus } from '@/lib/homeSectionPins';

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const key = typeof body?.key === 'string' ? body.key : '';
  if (!acceptsPins(key)) return NextResponse.json({ error: 'This section does not take products.' }, { status: 400 });
  let productIds: string[];
  try { productIds = parseProductIds(body?.productIds); } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const { error } = await supabaseAdmin.rpc('admin_set_home_section_products', { p_key: key, p_product_ids: productIds });
  if (error) {
    const status = pinErrorStatus(error);
    return NextResponse.json({ error: status === 500 ? 'Could not save the products.' : error.message }, { status });
  }
  return NextResponse.json({ key, productIds });
}
