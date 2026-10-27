// Inventory "Show on home": which Home sections one product is pinned to.
// GET ?productId= lists them; PUT { productId, keys } ticks/unticks sections,
// adding the product at the end of each newly ticked one
// (admin_set_product_home_sections, migration 20261027150000).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { acceptsPins, parseProductIds, pinErrorStatus } from '@/lib/homeSectionPins';

function productId(value: unknown) {
  try { return parseProductIds([value])[0]; } catch { return null; }
}

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const id = productId(new URL(request.url).searchParams.get('productId'));
  if (!id) return NextResponse.json({ error: 'Choose a product.' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('home_section_products').select('section_key').eq('product_id', id);
  if (error) return NextResponse.json({ error: 'Could not load the home sections.' }, { status: 500 });
  return NextResponse.json({ keys: (data ?? []).map((row) => row.section_key).sort() });
}

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const id = productId(body?.productId);
  const keys: unknown = body?.keys;
  if (!id) return NextResponse.json({ error: 'Choose a product.' }, { status: 400 });
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string' || !acceptsPins(key)) || new Set(keys).size !== keys.length) {
    return NextResponse.json({ error: 'Choose valid home sections.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('admin_set_product_home_sections', { p_product: id, p_keys: keys });
  if (error) {
    const status = pinErrorStatus(error);
    return NextResponse.json({ error: status === 500 ? 'Could not save the home sections.' : error.message }, { status });
  }
  return NextResponse.json({ keys: data ?? [] });
}
