// Premium background (Photoroom) for one product's main photo, admin only
// (lib/photoroom.ts, migration 20261122090000). The rembg cut-out stays the
// standard photo: a premium photo goes on the product only when the admin
// picks it ("use"), and switching back puts the standard photo back. A failed
// Generate leaves the product as it was and records the reason.
//   GET  ?productId=   enabled, usage, cap, current style, attempts
//   POST {action:'generate', productId, preset, color?}
//        text preset: + headline, textColor, background (720x810 PNG data URL
//        drawn in the admin from the headline)
//   POST {action:'use', productId, attemptId|null}   null = standard
//   POST {action:'cap', monthlyCap}
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { storePublicImage } from '@/features/media/publicImages';
import {
  PhotoroomError, callPhotoroom, capReached, checkFrame, headlineBackground, headlineLines, isPreset, monthStart, nextMonthLabel, photoroomKey, scrub,
} from '@/lib/photoroom';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9A-Fa-f]{6}$/;

export interface PremiumAttempt { id: string; preset: string; color: string | null; headline: string | null; status: 'done' | 'failed'; url: string | null; error: string | null; createdAt: string }
export interface PremiumState {
  enabled: boolean;
  used: number;
  cap: number;
  capMessage: string | null;
  style: 'standard' | 'premium';
  standardUrl: string | null;
  attempts: PremiumAttempt[];
}

async function usage(): Promise<{ used: number; cap: number }> {
  const [count, settings] = await Promise.all([
    supabaseAdmin.from('product_premium_images').select('id', { count: 'exact', head: true }).eq('status', 'done').gte('created_at', monthStart().toISOString()),
    supabaseAdmin.from('photoroom_settings').select('monthly_cap').eq('id', true).maybeSingle(),
  ]);
  if (count.error) throw count.error;
  if (settings.error) throw settings.error;
  return { used: count.count ?? 0, cap: settings.data?.monthly_cap ?? 300 };
}

function capMessage(used: number, cap: number): string | null {
  return capReached(used, cap) ? `Monthly Photoroom limit reached (${used} / ${cap}). Premium is off until ${nextMonthLabel()}.` : null;
}

// The product's standard photo: its latest cleaned main photo, else the photo
// it showed before the first premium pick.
async function standardUrl(productId: string, attempts: { standard_url: string | null }[]): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('product_image_jobs').select('result_url')
    .eq('product_id', productId).eq('slot', 'main').eq('status', 'done').not('result_url', 'is', null)
    .order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return (data?.[0]?.result_url as string | undefined) ?? attempts.find((a) => a.standard_url)?.standard_url ?? null;
}

async function attemptsOf(productId: string) {
  const { data, error } = await supabaseAdmin.from('product_premium_images')
    .select('id, preset, color, headline, status, url, error, standard_url, created_at').eq('product_id', productId)
    .order('created_at', { ascending: false }).limit(12);
  if (error) throw error;
  return data ?? [];
}

async function state(productId: string | null): Promise<PremiumState> {
  const enabled = photoroomKey() !== null;
  if (!enabled) return { enabled, used: 0, cap: 0, capMessage: null, style: 'standard', standardUrl: null, attempts: [] };
  const { used, cap } = await usage();
  const base = { enabled, used, cap, capMessage: capMessage(used, cap) };
  if (!productId) return { ...base, style: 'standard', standardUrl: null, attempts: [] };
  const [rows, product] = await Promise.all([
    attemptsOf(productId),
    supabaseAdmin.from('products').select('image_url').eq('id', productId).maybeSingle(),
  ]);
  if (product.error) throw product.error;
  const current = product.data?.image_url as string | null | undefined;
  return {
    ...base,
    style: rows.some((r) => r.url && r.url === current) ? 'premium' : 'standard',
    standardUrl: await standardUrl(productId, rows),
    attempts: rows.map((r) => ({ id: r.id, preset: r.preset, color: r.color, headline: r.headline, status: r.status, url: r.url, error: r.error, createdAt: r.created_at })),
  };
}

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const productId = new URL(request.url).searchParams.get('productId');
  if (productId && !UUID.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
  try {
    return NextResponse.json(await state(productId));
  } catch {
    return NextResponse.json({ error: 'Could not load Photoroom status.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const key = photoroomKey();
  if (!key) return NextResponse.json({ error: 'Premium background is not set up.' }, { status: 404 });

  if (body.action === 'cap') {
    const cap = Number(body.monthlyCap);
    if (!Number.isInteger(cap) || cap < 0 || cap > 100000) return NextResponse.json({ error: 'Cap must be a whole number from 0 to 100000.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('photoroom_settings').update({ monthly_cap: cap, updated_at: new Date().toISOString() }).eq('id', true);
    if (error) return NextResponse.json({ error: 'Could not save the cap.' }, { status: 500 });
    return NextResponse.json(await state(null));
  }

  const productId = body.productId;
  if (typeof productId !== 'string' || !UUID.test(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });

  if (body.action === 'use') {
    const attemptId = body.attemptId;
    if (attemptId !== null && (typeof attemptId !== 'string' || !UUID.test(attemptId))) return NextResponse.json({ error: 'Invalid photo.' }, { status: 400 });
    try {
      const rows = await attemptsOf(productId);
      const standard = await standardUrl(productId, rows);
      const target = attemptId === null ? standard : rows.find((r) => r.id === attemptId && r.status === 'done')?.url ?? null;
      if (!target) return NextResponse.json({ error: attemptId === null ? 'No standard photo to switch back to.' : 'That premium photo is not available.' }, { status: 409 });
      // Only swap between this product's own standard and premium photos, so
      // a newer upload is never overwritten.
      const own = [standard, ...rows.map((r) => r.url)].filter((u): u is string => !!u);
      const { data, error } = await supabaseAdmin.from('products').update({ image_url: target }).eq('id', productId).in('image_url', own).select('id');
      if (error) throw error;
      if (!data?.length) return NextResponse.json({ error: 'The product has a newer photo. Reopen it and try again.' }, { status: 409 });
      return NextResponse.json({ imageUrl: target, state: await state(productId) });
    } catch {
      return NextResponse.json({ error: 'Could not switch the photo.' }, { status: 500 });
    }
  }

  if (body.action !== 'generate') return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  const preset = body.preset;
  const color = typeof body.color === 'string' && HEX.test(body.color) ? body.color : null;
  if (!isPreset(preset)) return NextResponse.json({ error: 'Pick a background.' }, { status: 400 });
  const lines = preset === 'text' ? headlineLines(body.headline) : null;
  if (preset === 'text' && !lines) return NextResponse.json({ error: 'Type a headline: up to 2 lines, 40 characters.' }, { status: 400 });
  const textColor = preset === 'text' && typeof body.textColor === 'string' && HEX.test(body.textColor) ? body.textColor : null;

  try {
    const { used, cap } = await usage();
    const blocked = capMessage(used, cap);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 429 });

    // Start from the untouched upload behind the main photo (never a URL from
    // the browser), else the photo the product shows.
    const [product, job, rows] = await Promise.all([
      supabaseAdmin.from('products').select('image_url').eq('id', productId).maybeSingle(),
      supabaseAdmin.from('product_image_jobs').select('original_url').eq('product_id', productId).eq('slot', 'main')
        .order('created_at', { ascending: false }).limit(1),
      attemptsOf(productId),
    ]);
    if (product.error || job.error) throw product.error ?? job.error;
    const current = product.data?.image_url as string | null | undefined;
    const source = (job.data?.[0]?.original_url as string | undefined) ?? current;
    if (!source) return NextResponse.json({ error: 'Add a product photo first.' }, { status: 409 });
    const isPremium = rows.some((r) => r.url && r.url === current);
    const standard = isPremium ? await standardUrl(productId, rows) : current ?? null;

    let url: string | null = null;
    let failure: string | null = null;
    try {
      const image = await fetch(source, { signal: AbortSignal.timeout(20_000) });
      if (!image.ok) throw new PhotoroomError('Could not read the product photo.');
      const background = preset === 'text' ? await headlineBackground(body.background) : undefined;
      const bytes = await callPhotoroom(await image.blob(), { preset, color, background }, { key });
      await checkFrame(bytes);
      url = (await storePublicImage({ folder: 'products', bytes })).url;
    } catch (error) {
      failure = error instanceof PhotoroomError ? error.message : 'Premium photo failed. The standard photo is kept.';
      console.error('Photoroom generate failed', scrub(String((error as Error)?.message ?? error), key));
    }
    const { error } = await supabaseAdmin.from('product_premium_images').insert({
      product_id: productId, preset, color: preset === 'pastel' || preset === 'text' ? color : null,
      headline: lines?.join(' ') ?? null, text_color: textColor,
      status: url ? 'done' : 'failed', url, error: failure, standard_url: standard,
    });
    if (error) throw error;
    const next = await state(productId);
    return NextResponse.json(failure ? { error: failure, state: next } : { state: next }, { status: failure ? 502 : 200 });
  } catch {
    return NextResponse.json({ error: 'Premium photo failed. The standard photo is kept.' }, { status: 500 });
  }
}
