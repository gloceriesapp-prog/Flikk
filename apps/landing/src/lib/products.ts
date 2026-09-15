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

function mapRow(row: ProductRow): LandingProduct {
  const discountPercent =
    row.original_price && row.original_price > row.price
      ? Math.round((1 - row.price / row.original_price) * 100)
      : null;

  return {
    id: row.id,
    name: row.name,
    quantity: formatQuantity(row.product_variants ?? []),
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    discount: discountPercent && discountPercent > 0 ? `${discountPercent}% OFF` : undefined,
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
  };
}

// Fisher-Yates — unbiased shuffle, not Array.sort(() => Math.random() - 0.5)
// (that comparator-based approach is a well-known non-uniform shuffle).
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const POOL_SIZE = 30;

export async function fetchRandomProducts(count: number): Promise<LandingProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, original_price, image_url, product_variants(unit_type, quantity, is_default), stores!inner(is_active)')
    .eq('approval_status', 'approved')
    .eq('stores.is_active', true)
    .neq('stock_status', 'out_of_stock')
    .limit(POOL_SIZE);

  if (error) {
    // A public marketing page shouldn't hard-fail its whole layout over
    // this one row — empty carousel (ProductCarousel already handles zero
    // products gracefully) beats a 500 page.
    console.error('[fetchRandomProducts] failed to load products:', error);
    return [];
  }

  return shuffle((data ?? []) as unknown as ProductRow[])
    .slice(0, count)
    .map(mapRow);
}
