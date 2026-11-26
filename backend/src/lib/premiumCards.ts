// Home sections the admin switched to premium cards (home_sections.
// use_premium_images, migration 20261123090000): a product with a premium
// (Photoroom) photo shows it as its card image there. Every other section,
// grids included, keeps the standard (rembg) image_url.
import { supabase } from '../db/supabase.js';

export async function premiumSectionKeys(): Promise<Set<string>> {
  const { data, error } = await supabase.from('home_sections').select('key').eq('use_premium_images', true);
  // Before the migration (or on a read error) no section uses premium cards.
  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.key as string));
}

// A copy with the premium photo as the card image; the same product object
// can also appear in sections that keep the standard photo.
export function withPremiumCard<T>(product: T): T {
  const premium = (product as { premium_image_url?: string | null }).premium_image_url;
  return premium ? { ...product, image_url: premium } : product;
}
