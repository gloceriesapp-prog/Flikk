// Real file upload -> Supabase Storage. Replaces the old FileReader-to-
// data-URL approach in ProductImageUpload.tsx: a data URL embeds the whole
// file as base64 text directly in the products.image_url/stores.photo_url
// column and in every PATCH/POST body that touches the row afterward — for
// anything but a tiny image that bloats the row and the request, and is why
// uploads were silently not landing in the DB. This route uploads the
// actual bytes to Storage via the service-role client (same rationale as
// lib/supabase/admin.ts's own note) and returns a short public URL instead.
//
// Two buckets, not one — product photos and storefront photos are
// different content with a different lifecycle (a store's photo doesn't
// rotate with its catalog), and product-images is also where
// lib/bgColor.ts's pastel-card-background extraction runs; that logic has
// no meaning for a storefront photo, so it's skipped for store-images.
// `bucket` comes from the client (ProductImageUpload's own `bucket` prop)
// but is validated against this allow-list — never trust it blindly, a
// client requesting an arbitrary bucket name is exactly the kind of input
// a form field shouldn't get to decide unchecked.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateProductBgColor } from '@/lib/bgColor';

const ALLOWED_BUCKETS = ['product-images', 'store-images'] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — generous for a product/store photo, small enough to stay fast

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const requestedBucket = formData.get('bucket');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
    }
    const bucket: Bucket = ALLOWED_BUCKETS.includes(requestedBucket as Bucket)
      ? (requestedBucket as Bucket)
      : 'product-images';

    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    // Extraction failure isn't a request failure — the caller (Add/Edit
    // Product modal -> toProductRow) falls back to a category tint, then
    // mist, if this comes back null. See lib/bgColor.ts's own note on the
    // full fallback chain. Store photos don't have a bg_color concept at
    // all, so this is skipped entirely for store-images.
    const bgColor = bucket === 'product-images' ? await generateProductBgColor(data.publicUrl) : null;

    return NextResponse.json({ url: data.publicUrl, bgColor });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
