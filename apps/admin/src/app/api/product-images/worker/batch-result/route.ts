// Worker batch (apply): one reviewed dry-run result for an existing product.
// Records it as a finished job and publishes it like a queued job would,
// but only if the product still shows the photo the dry run processed.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseResult, publish, requireWorker, shouldPublish, storeResult } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const productId = String(form.get('productId') ?? '');
    const imageUrl = String(form.get('imageUrl') ?? '');
    const { data: product, error } = await supabaseAdmin.from('products').select('id, image_url').eq('id', productId).maybeSingle();
    if (error) throw error;
    if (!product || product.image_url !== imageUrl) return NextResponse.json({ ok: true, skipped: true });
    const result = parseResult(form);
    const resultUrl = await storeResult(form, result.reason);
    const { error: insertError } = await supabaseAdmin.from('product_image_jobs').insert({
      product_id: productId, original_url: imageUrl, result_url: resultUrl, status: result.status,
      reason: result.reason, model: result.model, quality: result.quality,
    });
    if (insertError) throw insertError;
    if (resultUrl && shouldPublish(result.reason)) await publish(productId, [imageUrl], resultUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the result.' }, { status: 400 });
  }
}
