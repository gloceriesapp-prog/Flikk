import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { productPhotoVersions } from '@/lib/productPhotoVersions';
import { isOriginalProductImage } from '@/lib/productImageOriginal';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Enable only after the queue understands original-image URLs. An old database
// must not silently strip a background the admin explicitly chose to preserve.
export async function GET(request?: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const productId = request && new URL(request.url).searchParams.get('productId');
  if (productId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.rpc('product_original_images_enabled');
  const enabled = !error && data === true;
  if (!productId || !enabled) return NextResponse.json({ enabled });
  try {
    const [product, jobs, premium] = await Promise.all([
      supabaseAdmin.from('products').select('image_url, extra_image_urls, product_options(image_url, extra_image_urls)').eq('id', productId).maybeSingle(),
      supabaseAdmin.from('product_image_jobs').select('original_url, result_url, status').eq('product_id', productId).order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('product_premium_images').select('url, standard_url').eq('product_id', productId).order('created_at', { ascending: false }).limit(100),
    ]);
    if (product.error || jobs.error || premium.error) throw product.error ?? jobs.error ?? premium.error;
    if (!product.data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const urls = [product.data.image_url, ...(product.data.extra_image_urls ?? []),
      ...(product.data.product_options ?? []).flatMap(option => [option.image_url, ...(option.extra_image_urls ?? [])])]
      .filter((url): url is string => !!url);
    const related = [...new Set([...urls, ...(jobs.data ?? []).flatMap(job => [job.original_url, job.result_url]),
      ...(premium.data ?? []).flatMap(photo => [photo.url, photo.standard_url])].filter((url): url is string => !!url))];
    const assets = related.length ? await supabaseAdmin.from('media_assets').select('public_url, source_url').in('public_url', related).limit(1000) : { data: [], error: null };
    if (assets.error) throw assets.error;
    const originals = [...new Set([...related, ...(assets.data ?? []).map(asset => asset.source_url)].filter((url): url is string => !!url && isOriginalProductImage(url)))];
    const fitted = originals.length ? await supabaseAdmin.from('media_assets').select('public_url, source_url').in('source_url', originals).limit(1000) : { data: [], error: null };
    if (fitted.error) throw fitted.error;
    const allAssets = [...(assets.data ?? []), ...(fitted.data ?? [])];
    const versions = productPhotoVersions([...related, ...allAssets.map(asset => asset.public_url)], allAssets, jobs.data ?? [], premium.data ?? []);
    const paidUrls = (premium.data ?? []).map(photo => photo.url).filter((url): url is string => !!url);
    const style = isOriginalProductImage(product.data.image_url ?? '') ? 'none' : urls.some(url => paidUrls.includes(url)) ? 'premium' : 'standard';
    return NextResponse.json({ enabled, versions, style, paidUrls });
  } catch {
    return NextResponse.json({ error: 'Could not load original photos. Reopen the product and try again.' }, { status: 500 });
  }
}
