// Worker: report one claimed job. Stores the processed WebP, records the
// outcome, and publishes it to the product when no review is needed.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseResult, publish, requireWorker, shouldPublish, storeCutout, storeResult } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const jobId = String(form.get('jobId') ?? '');
    const { data: job, error } = await supabaseAdmin.from('product_image_jobs')
      .select('id, product_id, slot, original_url, status, attempts').eq('id', jobId).maybeSingle();
    if (error) throw error;
    // Superseded by a newer photo (or already reported): drop the result.
    if (!job || job.status !== 'processing') return NextResponse.json({ ok: true, ignored: true });

    if (form.get('status') === 'failed') {
      // Retry up to 3 attempts in all, then stop: a photo that always fails
      // must not loop through the worker forever.
      await supabaseAdmin.from('product_image_jobs')
        .update({ status: job.attempts >= 3 ? 'failed' : 'queued', error: String(form.get('error') ?? '').slice(0, 500), updated_at: new Date().toISOString() })
        .eq('id', job.id);
      return NextResponse.json({ ok: true });
    }

    const result = parseResult(form);
    const resultUrl = await storeResult(form, result.reason);
    const cutoutUrl = await storeCutout(form);
    // Record the result URL before publishing: the queue trigger recognises
    // it as the pipeline's own write and does not queue it again.
    const { error: saveError } = await supabaseAdmin.from('product_image_jobs').update({
      status: result.status, reason: result.reason, model: result.model, quality: result.quality,
      result_url: resultUrl, cutout_url: cutoutUrl, error: null, updated_at: new Date().toISOString(),
    }).eq('id', job.id);
    if (saveError) throw saveError;
    if (resultUrl && shouldPublish(result.reason)) await publish(job, resultUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Supabase errors are plain objects, not Error instances: keep their text.
    const message = err instanceof Error ? err.message : (err as { message?: string } | null)?.message ?? 'Could not save the result.';
    console.error('Image job result failed', { message, code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
