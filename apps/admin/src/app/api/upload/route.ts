import { boundedForm, UploadBodyTooLarge } from '@/features/uploads/boundedForm';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
// Public media bytes live in R2; Supabase retains the durable asset reference.
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { storePublicImage } from '@/features/media/publicImages';
import { publicFolder, MediaError, r2Config } from '../../../../../../packages/server-media/policy.cjs';
import { generateProductBgColor } from '@/lib/bgColor';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB — generous for a product/store photo, small enough to stay fast

let activeUploads = 0;
export async function POST(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
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
    const webpBuffer = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' })
      .timeout({seconds:8})
      .rotate()
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const asset = await storePublicImage({ folder, bytes: webpBuffer });
    const bgColor = folder === 'products' ? await generateProductBgColor(webpBuffer) : null;
    return NextResponse.json({ ...asset, bgColor });
  } catch (err) {
    if (err instanceof MediaError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    if (err instanceof UploadBodyTooLarge) return NextResponse.json({error:'Upload must be under 6MB.'},{status:413});
    return NextResponse.json({ error: 'The image could not be uploaded. Try another photo.' }, { status: 400 });
  } finally {
    activeUploads--;
  }
}
