// Per-photo cut-out state for one product, for the Edit form's photo badges:
//   cleaning  queued or being processed
//   cleaned   this is a cleaned photo (or its cleaned version is ready:
//             cleanedUrl, so the form can swap it in before saving)
//   review    waiting in Photos to review
//   none      not part of the pipeline (or not saved yet)
import { isOriginalProductImage } from '@/lib/productImageOriginal';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export type PhotoState = 'cleaning' | 'cleaned' | 'review' | 'none';
export interface PhotoStatus { url: string; state: PhotoState; cleanedUrl: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { productId, urls } = (await request.json().catch(() => ({}))) as { productId?: unknown; urls?: unknown };
  if (typeof productId !== 'string' || !UUID.test(productId) || !Array.isArray(urls)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const photos = urls.filter((url): url is string => typeof url === 'string' && url.startsWith('https://')).slice(0, 8);
  const [jobs, assets] = await Promise.all([
    supabaseAdmin.from('product_image_jobs').select('original_url, result_url, status, created_at').eq('product_id', productId).order('created_at', { ascending: false }),
    photos.length ? supabaseAdmin.from('media_assets').select('public_url, source_url').in('public_url', photos) : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobs.error || assets.error) return NextResponse.json({ error: 'Could not load photo status.' }, { status: 500 });
  const sourceOf = new Map((assets.data ?? []).map((a) => [a.public_url as string, (a.source_url as string | null) ?? null]));
  const statuses: PhotoStatus[] = photos.map((url) => {
    if (isOriginalProductImage(url)) return { url, state: 'none', cleanedUrl: null };
    if ((jobs.data ?? []).some((job) => job.result_url === url)) return { url, state: 'cleaned', cleanedUrl: null };
    const source = sourceOf.get(url);
    const job = (jobs.data ?? []).find((j) => j.original_url === url || (source && j.original_url === source));
    if (!job) return { url, state: 'none', cleanedUrl: null };
    if (job.status === 'queued' || job.status === 'processing') return { url, state: 'cleaning', cleanedUrl: null };
    if (job.status === 'needs_review') return { url, state: 'review', cleanedUrl: null };
    if (job.status === 'done' && job.result_url) return { url, state: 'cleaned', cleanedUrl: job.result_url };
    return { url, state: 'none', cleanedUrl: null };
  });
  return NextResponse.json(statuses);
}
