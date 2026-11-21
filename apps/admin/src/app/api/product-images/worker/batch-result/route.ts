// Worker batch (apply): one reviewed dry-run result for an existing photo
// (main or extra). Records it as a finished job and publishes it like a
// queued job would, but only if the product still shows that photo.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseResult, publish, requireWorker, shouldPublish, storeResult, type JobSlot } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const productId = String(form.get('productId') ?? '');
    const imageUrl = String(form.get('imageUrl') ?? '');
    const slot: JobSlot = form.get('slot') === 'extra' ? 'extra' : 'main';
    const { data: product, error } = await supabaseAdmin.from('products').select('id, image_url, extra_image_urls').eq('id', productId).maybeSingle();
    if (error) throw error;
    const stillShown = slot === 'main' ? product?.image_url === imageUrl : ((product?.extra_image_urls ?? []) as string[]).includes(imageUrl);
    if (!product || !stillShown) return NextResponse.json({ ok: true, skipped: true });
    const result = parseResult(form);
    const resultUrl = await storeResult(form, result.reason);
    const job = { product_id: productId, slot, original_url: imageUrl };
    const { error: insertError } = await supabaseAdmin.from('product_image_jobs').insert({
      ...job, result_url: resultUrl, status: result.status, reason: result.reason, model: result.model, quality: result.quality,
    });
    if (insertError) throw insertError;
    if (resultUrl && shouldPublish(result.reason)) await publish(job, resultUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the result.' }, { status: 400 });
  }
}
