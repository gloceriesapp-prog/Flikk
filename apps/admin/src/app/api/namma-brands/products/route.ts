// In-stock, approved products of one brand (all shops), for picking a Namma
// Brands card's photos and previewing its pill. GET ?brandId=<uuid>.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import type { NammaProduct } from '@/lib/home/nammaBrands';

type Row = { id: string; name: string; image_url: string | null; price: number; original_price: number | null; stores: { name: string } | null };

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const brandId = new URL(request.url).searchParams.get('brandId');
  if (!isUuid(brandId)) return NextResponse.json({ error: 'Pick a brand.' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('products')
    .select('id, name, image_url, price, original_price, stores(name)')
    .eq('brand_id', brandId).eq('approval_status', 'approved').eq('preorder_enabled', false).is('quick_tab_key', null)
    .eq('is_in_stock', true).neq('stock_status', 'out_of_stock')
    .order('name').limit(200);
  if (error) {
    console.error('Namma Brands products read failed', { code: error.code });
    return NextResponse.json({ error: 'Could not load this brand’s products.' }, { status: 500 });
  }
  const products: NammaProduct[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id, name: row.name, imageUrl: row.image_url, price: Number(row.price),
    mrp: row.original_price === null ? null : Number(row.original_price), storeName: row.stores?.name ?? '',
  }));
  return NextResponse.json({ products });
}
