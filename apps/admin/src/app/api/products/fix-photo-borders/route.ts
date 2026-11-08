// One-time clean-up for product photos saved with a solid colour band baked in
// (an older upload step padded square photos to the 720x810 card). Each photo
// with a band that the current logic removes is re-saved and swapped in on the
// product; everything else is left untouched. Safe to run again: a cleaned
// photo has no band, so it is skipped.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { cleanBandedPhoto } from '@/lib/productImage';
import { storePublicImage } from '@/features/media/publicImages';

export const maxDuration = 300;

type Row = { id: string; name: string; image_url: string | null; extra_image_urls: string[] | null };

export async function POST() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await supabaseAdmin.from('products').select('id, name, image_url, extra_image_urls').not('image_url', 'is', null);
  if (error) return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });

  let checked = 0;
  const fixed: string[] = [];
  const failed: string[] = [];
  for (const row of data as Row[]) {
    const urls = [row.image_url, ...(row.extra_image_urls ?? [])].filter((u): u is string => !!u);
    const replaced = new Map<string, string>();
    for (const url of urls) {
      checked++;
      try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Gloceries admin photo clean-up)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cleaned = await cleanBandedPhoto(Buffer.from(await res.arrayBuffer()));
        if (cleaned) replaced.set(url, (await storePublicImage({ folder: 'products', bytes: cleaned })).url);
      } catch (err) {
        console.error('fix-photo-borders failed', row.id, url, err);
        failed.push(row.name);
      }
    }
    if (replaced.size === 0) continue;
    const swap = (u: string) => replaced.get(u) ?? u;
    const { error: updateError } = await supabaseAdmin.from('products').update({
      image_url: row.image_url ? swap(row.image_url) : row.image_url,
      extra_image_urls: row.extra_image_urls ? row.extra_image_urls.map(swap) : row.extra_image_urls,
    }).eq('id', row.id);
    if (updateError) failed.push(row.name);
    else fixed.push(`${row.name} (${replaced.size})`);
  }
  return NextResponse.json({ checked, fixed, failed: [...new Set(failed)] });
}
