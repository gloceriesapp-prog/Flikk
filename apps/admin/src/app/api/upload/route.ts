import { boundedForm, UploadBodyTooLarge } from '@/features/uploads/boundedForm';
import { requireAdmin } from '@/lib/auth/requireAdmin';
// Public media bytes live in R2; Supabase retains the durable asset reference.
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { storePublicImage } from '@/features/media/publicImages';
import { publicFolder, MediaError, r2Config } from '../../../../../../packages/server-media/policy.cjs';
import { generateProductBgColor } from '@/lib/bgColor';
import { fitProductImage, productAreaIsSmall } from '@/lib/productImage';
import { supabaseAdmin } from '@/lib/supabase/admin';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — generous for a product/store photo, small enough to stay fast
// Untouched product uploads live beside the fitted photos under this fixed
// scope (products/<scope>/...), for the cut-out pipeline (workers/image-cutout).
const ORIGINALS_SCOPE = '0f1a2b3c-0000-4000-8000-0000000a11c0';
const SMALL_PHOTO_WARNING = 'This photo is small and may look blurry, use a bigger one.';

let activeUploads = 0;
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  if (activeUploads >= 2) return NextResponse.json({error:'Image processing is busy. Retry shortly.'},{status:503,headers:{'Retry-After':'2'}});
  activeUploads++;
  try {
    const formData = await boundedForm(request, 6 * 1024 * 1024);
    const file = formData.get('file');
    const requestedBucket = formData.get('bucket');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Choose a JPG, PNG or WebP image.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
    }
    const folder = publicFolder(typeof requestedBucket === 'string' ? requestedBucket : 'products');
    r2Config(process.env);
    // Content artwork retains more detail than thumbnail photographs.
    const maxDimension = ['appsui', 'banners', 'festivals', 'illustrations'].includes(folder) ? 2048 : 800;
    const input = Buffer.from(await file.arrayBuffer());
    // Product photos are framed to the card's 720×810; other folders keep their shape.
    const webpBuffer = folder === 'products' ? await fitProductImage(input) : await sharp(input, { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' })
      .timeout({seconds:8})
      .rotate()
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const asset = await storePublicImage({ folder, bytes: webpBuffer });
    const bgColor = folder === 'products' ? await generateProductBgColor(webpBuffer) : null;
    if (folder !== 'products') return NextResponse.json({ ...asset, bgColor });
    // The original, full detail and never cropped, for the cut-out worker. The
    // product goes live on the fitted photo now; a job is queued when it is saved.
    const original = await storeOriginal(input).catch(() => null);
    if (original) await supabaseAdmin.from('media_assets').update({ source_url: original }).eq('id', asset.assetId);
    const warning = (await productAreaIsSmall(input).catch(() => false)) ? SMALL_PHOTO_WARNING : null;
    return NextResponse.json({ ...asset, bgColor, warning });
  } catch (err) {
    if (err instanceof MediaError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof UploadBodyTooLarge) return NextResponse.json({error:'Upload must be under 6MB.'},{status:413});
    return NextResponse.json({ error: 'The image could not be uploaded. Try another photo.' }, { status: 400 });
  } finally {
    activeUploads--;
  }
}

// WebP is the only stored format; quality 95 keeps the detail the cut-out
// needs. Only an oversized photo is scaled down, to stay under 5MB.
async function storeOriginal(input: Buffer): Promise<string> {
  const bytes = await sharp(input, { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' })
    .timeout({ seconds: 8 }).rotate()
    .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 95 }).toBuffer();
  const { url } = await storePublicImage({ folder: 'products', scope: ORIGINALS_SCOPE, bytes });
  return url;
}
