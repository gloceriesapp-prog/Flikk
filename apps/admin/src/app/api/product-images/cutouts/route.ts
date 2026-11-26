// Transparent product-only cut-outs (product_image_jobs.cutout_url), newest
// first, one per product, for the "NEW for you" tile picker.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export interface ProductCutout { productId: string; productName: string; cutoutUrl: string }

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('product_image_jobs')
    .select('product_id, cutout_url, updated_at, products(name)')
    .eq('status', 'done').not('cutout_url', 'is', null)
    .order('updated_at', { ascending: false }).limit(400);
  if (error) return NextResponse.json({ error: 'Could not load cut-outs.' }, { status: 500 });
  const seen = new Set<string>();
  const cutouts: ProductCutout[] = [];
  for (const row of data ?? []) {
    const product = (Array.isArray(row.products) ? row.products[0] : row.products) as { name: string } | null;
    if (!product || seen.has(row.product_id)) continue;
    seen.add(row.product_id);
    cutouts.push({ productId: row.product_id, productName: product.name, cutoutUrl: row.cutout_url as string });
  }
  return NextResponse.json(cutouts);
}
