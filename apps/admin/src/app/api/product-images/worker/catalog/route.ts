// Worker batch (dry run): approved products with a photo, 200 per page by id.
// processed = the current photo already came out of the pipeline or was
// already decided on, so the batch skips it.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorker } from '@/lib/productImageJobs';

const PAGE = 200;

export async function GET(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  const after = new URL(request.url).searchParams.get('after');
  let query = supabaseAdmin.from('products').select('id, name, image_url')
    .eq('approval_status', 'approved').like('image_url', 'https://%').order('id').limit(PAGE);
  if (after) query = query.gt('id', after);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });
  const urls = (data ?? []).map((p) => p.image_url as string);
  const [results, originals] = await Promise.all([
    supabaseAdmin.from('product_image_jobs').select('result_url').in('result_url', urls),
    supabaseAdmin.from('product_image_jobs').select('original_url').in('original_url', urls),
  ]);
  if (results.error || originals.error) return NextResponse.json({ error: 'Could not load jobs.' }, { status: 500 });
  const seen = new Set([...(results.data ?? []).map((r) => r.result_url), ...(originals.data ?? []).map((r) => r.original_url)]);
  return NextResponse.json({
    products: (data ?? []).map((p) => ({ id: p.id, name: p.name, imageUrl: p.image_url, processed: seen.has(p.image_url) })),
    next: (data ?? []).length === PAGE ? data!.at(-1)!.id : null,
  });
}
