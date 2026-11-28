// Worker batch (dry run): every photo of approved products, main and extra,
// 200 products per page by id. processed = that photo already came out of
// the pipeline or was already decided on, so the batch skips it.
import { isOriginalProductImage } from '@/lib/productImageOriginal';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorker } from '@/lib/productImageJobs';

const PAGE = 200;

export async function GET(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  const after = new URL(request.url).searchParams.get('after');
  let query = supabaseAdmin.from('products').select('id, name, image_url, extra_image_urls')
    .eq('approval_status', 'approved').order('id').limit(PAGE);
  if (after) query = query.gt('id', after);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });
  // By product id: a filter on hundreds of full image URLs is too long a request.
  const { data: jobs, error: jobsError } = await supabaseAdmin.from('product_image_jobs')
    .select('product_id, original_url, result_url').in('product_id', (data ?? []).map((p) => p.id));
  if (jobsError) return NextResponse.json({ error: 'Could not load jobs.' }, { status: 500 });
  const seen = new Set((jobs ?? []).flatMap((j) => [`${j.product_id} ${j.original_url}`, `${j.product_id} ${j.result_url}`]));
  const photos = (data ?? []).flatMap((p) => [
    ...(p.image_url?.startsWith('https://') ? [{ slot: 'main', url: p.image_url as string }] : []),
    ...((p.extra_image_urls ?? []) as string[]).map((url) => ({ slot: 'extra', url })),
  ].map(({ slot, url }) => ({ id: p.id, name: p.name, slot, imageUrl: url, processed: isOriginalProductImage(url) || seen.has(`${p.id} ${url}`) })));
  return NextResponse.json({ products: photos, next: (data ?? []).length === PAGE ? data!.at(-1)!.id : null });
}
