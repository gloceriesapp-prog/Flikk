import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import { supabaseAdmin } from '@/lib/supabase/admin';

const fields = 'id, name, logo_url, is_active, popular_position, popular_image_url, popular_banner_url';
type Row = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  popular_position: number | null;
  popular_image_url: string | null;
  popular_banner_url: string | null;
};

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const brands: Row[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabaseAdmin.from('brands').select(fields)
      .order('name').order('id').range(offset, offset + batchSize - 1);
    if (error) {
      console.error('Popular brands read failed', error);
      return NextResponse.json({ error: 'Could not load brands.' }, { status: 500 });
    }
    brands.push(...data);
    if (data.length < batchSize) return NextResponse.json(brands);
  }
}

function validImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return value.startsWith('https://') && url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => null) as {
    id?: unknown;
    position?: unknown;
    imageUrl?: unknown;
    bannerUrl?: unknown;
  } | null;
  if (!body || !isUuid(body.id)) return NextResponse.json({ error: 'Choose a brand.' }, { status: 400 });

  const { id, position, imageUrl, bannerUrl } = body;
  if (position !== null && (typeof position !== 'number' || !Number.isInteger(position) || position < 1 || position > 1000)) {
    return NextResponse.json({ error: 'Choose a position from 1 to 1000, or leave the brand hidden.' }, { status: 400 });
  }
  if (imageUrl !== null && !validImageUrl(imageUrl)) {
    return NextResponse.json({ error: 'Upload an image or enter a valid HTTPS image URL.' }, { status: 400 });
  }

  if (bannerUrl !== undefined && bannerUrl !== null && !validImageUrl(bannerUrl)) {
    return NextResponse.json({ error: 'Enter a valid HTTPS banner URL or leave it empty.' }, { status: 400 });
  }
  // Older admin clients omit this field; preserve the existing banner in that case.
  const bannerUpdate = bannerUrl === undefined ? {} : { popular_banner_url: bannerUrl };
  let query = supabaseAdmin.from('brands')
    .update({ popular_position: position, popular_image_url: imageUrl, ...bannerUpdate }).eq('id', id);
  if (position !== null) query = query.eq('is_active', true);
  const { data, error } = await query.select(fields).maybeSingle();
  if (error?.code === '23505') {
    return NextResponse.json({ error: 'That position is already taken. Choose another.' }, { status: 409 });
  }
  if (error?.code === '23514') {
    return NextResponse.json({ error: 'Add an image or an existing brand logo before showing this brand.' }, { status: 400 });
  }
  if (error) {
    console.error('Popular brand update failed', error);
    return NextResponse.json({ error: 'Could not save the brand.' }, { status: 500 });
  }
  return data
    ? NextResponse.json(data)
    : NextResponse.json({ error: 'The brand is missing or inactive.' }, { status: 404 });
}
