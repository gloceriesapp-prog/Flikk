// Worker: report one claimed job. Stores the processed WebP, records the
// outcome, and publishes it to the product when no review is needed.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseResult, publish, requireWorker, shouldPublish, storeResult } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const jobId = String(form.get('jobId') ?? '');
    const { data: job, error } = await supabaseAdmin.from('product_image_jobs')
      .select('id, product_id, original_url, status').eq('id', jobId).maybeSingle();
    if (error) throw error;
    // Superseded by a newer photo (or already reported): drop the result.
    if (!job || job.status !== 'processing') return NextResponse.json({ ok: true, ignored: true });

    if (form.get('status') === 'failed') {
      await supabaseAdmin.from('product_image_jobs')
        .update({ status: 'queued', error: String(form.get('error') ?? '').slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', job.id);
      return NextResponse.json({ ok: true });
    }

    const result = parseResult(form);
    const resultUrl = await storeResult(form, result.reason);
    // Record the result URL before publishing: the queue trigger recognises
    // it as the pipeline's own write and does not queue it again.
    const { error: saveError } = await supabaseAdmin.from('product_image_jobs').update({
      status: result.status, reason: result.reason, model: result.model, quality: result.quality,
      result_url: resultUrl, error: null, updated_at: new Date().toISOString(),
    }).eq('id', job.id);
    if (saveError) throw saveError;
    if (resultUrl && shouldPublish(result.reason)) {
      const { data: assets } = await supabaseAdmin.from('media_assets').select('public_url').eq('source_url', job.original_url);
      await publish(job.product_id, [job.original_url, ...(assets ?? []).map((a) => a.public_url as string)], resultUrl);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Image job result failed', { message: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the result.' }, { status: 400 });
  }
}
