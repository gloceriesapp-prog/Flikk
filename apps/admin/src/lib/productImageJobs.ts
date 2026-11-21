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

export interface ProductImageJob {
  id: string;
  productId: string;
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

// Publish when nothing needs a human: done, or only "low resolution" (still
// the better photo). Only if the product still shows the photo this job
// started from, so a newer upload is never overwritten.
export function shouldPublish(reason: JobReason | null): boolean {
  return reason === null || reason === 'low resolution';
}

export async function publish(productId: string, fromUrls: string[], resultUrl: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('products').update({ image_url: resultUrl })
    .eq('id', productId).in('image_url', fromUrls).select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}
