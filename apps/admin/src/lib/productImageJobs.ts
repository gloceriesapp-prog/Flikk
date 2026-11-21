// Product photo cut-out queue (product_image_jobs, migration 20261121090000;
// worker: workers/image-cutout). The Python worker reaches the admin app only
// through the /api/product-images/worker/* routes with IMAGE_WORKER_TOKEN, so
// it never holds database or storage credentials.
import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { storePublicImage } from '@/features/media/publicImages';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const JOB_REASONS = ['cut-out quality', 'low resolution', 'too small'] as const;
export type JobReason = (typeof JOB_REASONS)[number];
export const JOB_MODELS = ['isnet-general-use', 'birefnet-general'] as const;

export type JobSlot = 'main' | 'extra';

export interface ProductImageJob {
  id: string;
  productId: string;
  slot: JobSlot;
  productName: string;
  originalUrl: string;
  resultUrl: string | null;
  currentUrl: string | null;
  status: 'queued' | 'processing' | 'done' | 'needs_review' | 'failed';
  reason: JobReason | null;
  model: (typeof JOB_MODELS)[number];
  updatedAt: string;
}

// Bearer IMAGE_WORKER_TOKEN, compared in constant time. Unset token = closed.
export function requireWorker(request: Request): NextResponse | null {
  const expected = process.env.IMAGE_WORKER_TOKEN ?? '';
  const given = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const ok = expected.length >= 32 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Worker output fields, validated. "done" carries no reason; needs_review
// always has one; only "too small" comes without a processed file.
export function parseResult(form: FormData): { status: 'done' | 'needs_review'; reason: JobReason | null; model: string; quality: unknown } {
  const status = form.get('status');
  const reason = form.get('reason') || null;
  const model = form.get('model');
  if (status !== 'done' && status !== 'needs_review') throw new Error('Invalid status.');
  if (reason !== null && !JOB_REASONS.includes(reason as JobReason)) throw new Error('Invalid reason.');
  if ((status === 'done') !== (reason === null)) throw new Error('Status and reason disagree.');
  if (!JOB_MODELS.includes(model as (typeof JOB_MODELS)[number])) throw new Error('Invalid model.');
  let quality: unknown = null;
  try { quality = JSON.parse(String(form.get('quality') ?? 'null')); } catch { /* optional */ }
  return { status, reason: reason as JobReason | null, model: String(model), quality };
}

export async function storeResult(form: FormData, reason: JobReason | null): Promise<string | null> {
  const file = form.get('file');
  if (reason === 'too small') return null;
  if (!(file instanceof File)) throw new Error('Processed image missing.');
  const { url } = await storePublicImage({ folder: 'products', bytes: Buffer.from(await file.arrayBuffer()) });
  return url;
}

// The transparent product-only copy (when the cut-out passed), or null.
export async function storeCutout(form: FormData): Promise<string | null> {
  const file = form.get('cutout');
  if (!(file instanceof File)) return null;
  const { url } = await storePublicImage({ folder: 'products', bytes: Buffer.from(await file.arrayBuffer()) });
  return url;
}

// Home "NEW for you" tile pictures: App content copy keys the customer app
// reads (home.newForYou.image1-4). Automatic mode (home.newForYou.auto =
// 'true') fills them with 4 random transparent cut-outs and refreshes them
// whenever a new photo is cleaned.
export const NEW_FOR_YOU_KEYS = ['home.newForYou.image1', 'home.newForYou.image2', 'home.newForYou.image3', 'home.newForYou.image4'];
export const NEW_FOR_YOU_AUTO_KEY = 'home.newForYou.auto';

export async function saveNewForYou(urls: string[], auto: boolean): Promise<void> {
  const { data: row, error } = await supabaseAdmin.from('app_content').select('copy').eq('id', true).maybeSingle();
  if (error) throw error;
  const copy = { ...((row?.copy as Record<string, string> | null) ?? {}) };
  NEW_FOR_YOU_KEYS.forEach((key, i) => { copy[key] = urls[i] ?? ''; });
  copy[NEW_FOR_YOU_AUTO_KEY] = auto ? 'true' : 'false';
  const { error: saveError } = await supabaseAdmin.from('app_content').update({ copy, updated_at: new Date().toISOString() }).eq('id', true);
  if (saveError) throw saveError;
}

// 4 random cut-outs from the 100 most recent products that have one.
export async function randomCutouts(count = 4): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from('product_image_jobs').select('product_id, cutout_url')
    .eq('status', 'done').not('cutout_url', 'is', null).order('updated_at', { ascending: false }).limit(300);
  if (error) throw error;
  const byProduct = new Map<string, string>();
  for (const row of data ?? []) if (!byProduct.has(row.product_id) && byProduct.size < 100) byProduct.set(row.product_id, row.cutout_url as string);
  const pool = [...byProduct.values()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// After a photo is cleaned: in automatic mode, reshuffle the tile pictures.
export async function refreshAutoNewForYou(): Promise<void> {
  const { data } = await supabaseAdmin.from('app_content').select('copy').eq('id', true).maybeSingle();
  if ((data?.copy as Record<string, string> | null)?.[NEW_FOR_YOU_AUTO_KEY] !== 'true') return;
  const urls = await randomCutouts();
  if (urls.length) await saveNewForYou(urls, true);
}

// Publish when nothing needs a human: done, or only "low resolution" (still
// the better photo). Only if the product still shows the photo this job
// started from, so a newer upload is never overwritten.
export function shouldPublish(reason: JobReason | null): boolean {
  return reason === null || reason === 'low resolution';
}

// Put a cleaned photo on the product in place of the photo its job started
// from: the main photo, or that one extra photo (order kept). Only while the
// product still shows it (the original or a fitted upload made from it), so
// a newer or removed photo is never overwritten or brought back.
export async function publish(job: { product_id: string; slot: JobSlot; original_url: string }, resultUrl: string): Promise<boolean> {
  const { data: assets, error: assetError } = await supabaseAdmin.from('media_assets').select('public_url').eq('source_url', job.original_url);
  if (assetError) throw assetError;
  const from = [job.original_url, ...(assets ?? []).map((a) => a.public_url as string)];
  if (job.slot === 'extra') {
    const { data, error } = await supabaseAdmin.rpc('replace_product_extra_image', { p_product: job.product_id, p_from: from, p_to: resultUrl });
    if (error) throw error;
    return data === true;
  }
  const { data, error } = await supabaseAdmin.from('products').update({ image_url: resultUrl })
    .eq('id', job.product_id).in('image_url', from).select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}
