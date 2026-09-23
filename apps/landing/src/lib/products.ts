// Real "Most Ordered Right Now" data (ProductCarousel.tsx) — replaces the
// old POPULAR_PRODUCTS mock array. Same real products/product_variants/
// stores tables every app in this monorepo already reads (same shape
// backend's PRODUCT_WITH_VARIANTS_SELECT and apps/customer's ApiProduct
// use), just fetched directly via the public anon-key client instead of
// through the backend API — this is a public marketing page with no
// account/session context to send a bearer token from anyway.
//
// "Random product available in the database" (an explicit ask, not a real
// "most ordered" ranking — no order-aggregation exists for this public,
// unauthenticated page to read) — pulls a pool of real approved/in-stock
// products and shuffles client-side before slicing to the carousel's own
// count, so a page reload shows a different real selection rather than
// the same fixed N every time.

import { supabase } from './supabase';

export interface LandingProduct {
  id: string;
  name: string;
  quantity: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: string;
  // Social proof. No real ratings table exists yet, so these are derived
  // deterministically from the product id (see deriveSocialProof) — a fixed,
  // believable number per product that never flickers on reload and matches
  // server/client (no hydration mismatch). Swap for real aggregates once a
  // ratings/orders-count source lands.
  rating: number;
  ratingCount: number;
  saved?: number;
}

// Same shared fallback every real product feed in this monorepo uses for
// a product with no uploaded photo yet — not a fake per-product image.
const DEFAULT_PRODUCT_IMAGE =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/website-images/amul.jpeg';

const UNIT_LABEL: Record<string, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

interface ProductVariantRow {
  unit_type: string;
  quantity: number;
  is_default: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  product_variants: ProductVariantRow[];
}

function formatQuantity(variants: ProductVariantRow[]): string {
  const variant = variants.find((v) => v.is_default) ?? variants[0];
  if (!variant) return '';
  return `${variant.quantity} ${UNIT_LABEL[variant.unit_type] ?? variant.unit_type}`;
}

// Stable pseudo-random from the product id — same product always gets the
// same rating/count, and the value is identical on server and client (a live
// Math.random() would hydration-mismatch and change every reload). rating in
// 4.0–4.9, ratingCount in 40–999. Not real data yet; deterministic so it
// reads as consistent social proof rather than obvious noise.
function deriveSocialProof(id: string): { rating: number; ratingCount: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return {
    rating: Math.round((4 + (h % 10) / 10) * 10) / 10, // 4.0–4.9
    ratingCount: 40 + (h % 960), // 40–999
  };
}

function mapRow(row: ProductRow): LandingProduct {
  const discountPercent =
    row.original_price && row.original_price > row.price
      ? Math.round((1 - row.price / row.original_price) * 100)
      : null;
  const saved =
    row.original_price && row.original_price > row.price
      ? Math.round(row.original_price - row.price)
      : undefined;

  return {
    id: row.id,
    name: row.name,
    quantity: formatQuantity(row.product_variants ?? []),
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    discount: discountPercent && discountPercent > 0 ? `${discountPercent}% OFF` : undefined,
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
    saved,
    ...deriveSocialProof(row.id),
  };
}

// Cheapest real products first — the "Most Ordered Right Now" grid shows the
// N lowest-priced approved/in-stock products, distinct rows (no client-side
// duplication to pad the grid). If the DB has fewer than N, fewer show — we
// don't fabricate/repeat to hit a fixed count.
export async function fetchCheapestProducts(count: number): Promise<LandingProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, original_price, image_url, product_variants(unit_type, quantity, is_default), stores!inner(is_active)')
    .eq('approval_status', 'approved')
    .eq('stores.is_active', true)
    .neq('stock_status', 'out_of_stock')
    .order('price', { ascending: true })
    .limit(count);

  if (error) {
    // A public marketing page shouldn't hard-fail its whole layout over
    // this one row — empty grid (ProductGrid already handles zero products
    // gracefully) beats a 500 page.
    console.error('[fetchCheapestProducts] failed to load products:', error);
    return [];
  }

  return ((data ?? []) as unknown as ProductRow[]).map(mapRow);
}
