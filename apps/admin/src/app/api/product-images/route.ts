// Needs review list: photos the cut-out pipeline would not publish alone.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import type { ProductImageJob } from '@/lib/productImageJobs';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('product_image_jobs')
    .select('id, product_id, slot, original_url, result_url, status, reason, model, updated_at, products(name, image_url)')
    .in('status', ['needs_review', 'queued', 'processing']).order('updated_at', { ascending: false }).limit(300);
  if (error) return NextResponse.json({ error: 'Could not load photos to review.' }, { status: 500 });
  const jobs: ProductImageJob[] = (data ?? []).map((row) => {
    const product = (Array.isArray(row.products) ? row.products[0] : row.products) as { name: string; image_url: string | null } | null;
    return { id: row.id, productId: row.product_id, slot: row.slot, productName: product?.name ?? 'Deleted product', originalUrl: row.original_url,
      resultUrl: row.result_url, currentUrl: product?.image_url ?? null, status: row.status, reason: row.reason, model: row.model, updatedAt: row.updated_at };
  });
  return NextResponse.json(jobs);
}
