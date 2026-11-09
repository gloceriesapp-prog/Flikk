import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Context = { params: Promise<{ id: string }> };

async function readPhoto(request: Request, { params }: Context) {
  const { id } = await params;
  const indexParam = new URL(request.url).searchParams.get('index') ?? '';
  if (!/^\d{1,2}$/.test(indexParam)) return null;
  const index = Number(indexParam);
  const { data, error } = await supabaseAdmin.from('products')
    .select('image_url, extra_image_urls').eq('id', id).eq('approval_status', 'pending').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const extras: string[] = data.extra_image_urls;
  const url = index === 0 ? data.image_url : extras[index - 1];
  return url ? { id, index, url, extras, cover: data.image_url } : null;
}

function photoError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readyProductAsset(url: string) {
  const { data, error } = await supabaseAdmin.from('media_assets').select('object_key')
    .eq('public_url', url).eq('purpose', 'products').eq('status', 'ready')
    .eq('provider', 'r2').eq('visibility', 'public').maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request: Request, context: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const photo = await readPhoto(request, context);
    if (!photo) return photoError('Photo no longer in review.', 404);
    const asset = await readyProductAsset(photo.url);
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');
    // Only fetch a registered object from the configured image CDN. Never
    // follow a redirect or fetch a URL supplied by a product editor.
    if (!base?.startsWith('https://') || !asset || photo.url !== `${base}/${asset.object_key}`) {
      return photoError('This photo cannot be downloaded here. Open View to save the original.', 404);
    }
    const source = await fetch(photo.url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    if (!source.ok || !source.body || source.headers.get('content-type')?.split(';')[0] !== 'image/webp') {
      return photoError('Could not retrieve the photo. Please try again.', 502);
    }
    return new Response(source.body, { headers: {
      'Content-Type': 'image/webp',
      'Content-Disposition': `attachment; filename="product-photo-${photo.index + 1}.webp"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return photoError('Could not download the photo. Please try again.', 502);
  }
}

export async function PATCH(request: Request, context: Context) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const photo = await readPhoto(request, context);
    const body = await request.json().catch(() => null);
    if (!photo || photo.url !== body?.previousUrl) return photoError('The gallery changed. Refresh and try again.', 409);
    const replacement = body?.url;
    if (typeof replacement !== 'string' || replacement.length > 2048 || !await readyProductAsset(replacement)) {
      return photoError('Upload a product photo before replacing this image.', 400);
    }
    if ([photo.cover, ...photo.extras].includes(replacement)) {
      return photoError('This photo is already in the gallery.', 400);
    }
    const extras = photo.extras.map((url, i) => i + 1 === photo.index ? replacement : url);
    const changes = photo.index === 0 ? { image_url: replacement, bg_color: null } : { extra_image_urls: extras };

    // Compare the stored gallery so concurrent edits cannot overwrite a
    // newer replacement or apply to a listing that has left the review queue.
    const update = supabaseAdmin.from('products').update(changes)
      .eq('id', photo.id).eq('approval_status', 'pending')
      .eq('extra_image_urls', '{' + photo.extras.map((url) => JSON.stringify(url)).join(',') + '}');
    const { data, error } = await (photo.cover ? update.eq('image_url', photo.cover) : update.is('image_url', null))
      .select('id').maybeSingle();
    if (error) throw error;
    if (!data) return photoError('The gallery changed. Refresh and try again.', 409);
    return NextResponse.json({ ok: true });
  } catch {
    return photoError('Could not replace the photo. Please try again.', 500);
  }
}
