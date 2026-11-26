// One review decision:
//   accept   publish the processed photo
//   original keep the product's current photo and close the job
//   rerun    queue it again with birefnet-general
//   replace  put a newly uploaded photo on the product (it is queued afresh)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { publish } from '@/lib/productImageJobs';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const { action, imageUrl } = (await request.json().catch(() => ({}))) as { action?: unknown; imageUrl?: unknown };
  const { data: job, error } = await supabaseAdmin.from('product_image_jobs')
    .select('id, product_id, slot, original_url, result_url, status').eq('id', id).maybeSingle();
  if (error || !job) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  if (job.status !== 'needs_review') return NextResponse.json({ error: 'This photo was already handled.' }, { status: 409 });
  const now = new Date().toISOString();
  try {
    if (action === 'accept') {
      if (!job.result_url) return NextResponse.json({ error: 'There is no processed photo to accept.' }, { status: 400 });
      const published = await publish(job, job.result_url);
      if (!published) return NextResponse.json({ error: 'The product has a newer photo now.' }, { status: 409 });
      await supabaseAdmin.from('product_image_jobs').update({ status: 'done', updated_at: now }).eq('id', id);
    } else if (action === 'original') {
      await supabaseAdmin.from('product_image_jobs').update({ status: 'done', result_url: null, updated_at: now }).eq('id', id);
    } else if (action === 'rerun') {
      const { error: rerunError } = await supabaseAdmin.from('product_image_jobs')
        .update({ status: 'queued', model: 'birefnet-general', reason: null, result_url: null, attempts: 0, error: null, updated_at: now }).eq('id', id);
      if (rerunError) return NextResponse.json({ error: 'A newer job is already queued for this product.' }, { status: 409 });
    } else if (action === 'replace') {
      const { data: asset } = await supabaseAdmin.from('media_assets').select('id')
        .eq('public_url', typeof imageUrl === 'string' ? imageUrl : '').eq('purpose', 'products').eq('status', 'ready').maybeSingle();
      if (!asset) return NextResponse.json({ error: 'Upload the new photo first.' }, { status: 400 });
      // Swap the new upload in where the reviewed photo is; the queue
      // trigger then cuts it out like any new photo.
      await supabaseAdmin.from('product_image_jobs').update({ status: 'failed', error: 'Replaced by a new upload.', updated_at: now }).eq('id', id);
      const replaced = await publish(job, imageUrl as string);
      if (!replaced) return NextResponse.json({ error: 'The product has a newer photo now.' }, { status: 409 });
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save the decision.' }, { status: 500 });
  }
}
