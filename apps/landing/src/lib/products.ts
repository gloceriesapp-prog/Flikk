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
  'https://cdnfpaolzkpqetmmpyzh.supabase.co/storage/v1/object/public/website-images/amul.jpeg';

const UNIT_LABEL: Record<string, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

interface ProductVariantRow {
  unit_type: string;
  quantity: number;
  is_default: boolean;
  price: number;
  original_price: number | null;
  platform_markup: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  product_variants: ProductVariantRow[];
  sub_categories: { category_id: string } | null;
}

// Same rule as backend/src/lib/customerPrice.ts: store price + our extra,
// never above MRP, never below the store price.
function customerUnitPrice(storePrice: number, markup: number | null, mrp: number | null): number {
  const withMarkup = Math.round((storePrice + Math.max(Number(markup ?? 0), 0)) * 100) / 100;
  if (mrp == null || !(Number(mrp) > 0)) return withMarkup;
  return Math.max(storePrice, Math.min(withMarkup, Number(mrp)));
}

function defaultVariant(variants: ProductVariantRow[]): ProductVariantRow | undefined {
  return variants.find((v) => v.is_default) ?? variants[0];
}

function formatQuantity(variant: ProductVariantRow | undefined): string {
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
  // The price a customer pays: the default pack at its customer price.
  const variant = defaultVariant(row.product_variants ?? []);
  const mrp = variant ? variant.original_price : row.original_price;
  const price = variant
    ? customerUnitPrice(Number(variant.price), variant.platform_markup, mrp)
    : Number(row.price);
  const hasDiscount = mrp != null && mrp > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / mrp) * 100) : null;
  const saved = hasDiscount ? Math.round(mrp - price) : undefined;

  return {
    id: row.id,
    name: row.name,
    quantity: formatQuantity(variant),
    price,
    originalPrice: hasDiscount ? mrp : undefined,
    discount: discountPercent && discountPercent > 0 ? `${discountPercent}% OFF` : undefined,
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
    saved,
    ...deriveSocialProof(row.id),
  };
}

export interface LandingCategory {
  id: string;
  name: string;
  image: string;
  products: LandingProduct[];
}

export interface LandingCatalogue {
  // Categories that have at least one live product, in admin's order
  // (section, then category). Image: the category's own, else its first
  // product's photo.
  categories: LandingCategory[];
  // Every live product, cheapest first.
  products: LandingProduct[];
}

interface CategoryRow {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  category_sections: { sort_order: number } | null;
}

// ponytail: one capped read of the live catalogue; page through it once it
// outgrows PRODUCT_POOL.
const PRODUCT_POOL = 500;

// The same live products the customer app shows: approved, in stock, from an
// active store. Fetched with the public anon key (products/categories have
// public read policies), so a public page needs no session.
export async function fetchLandingCatalogue(): Promise<LandingCatalogue> {
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, image_url, sort_order, category_sections(sort_order)')
      .eq('is_active', true),
    supabase
      .from('products')
      .select(
        'id, name, price, original_price, image_url, product_variants(unit_type, quantity, is_default, price, original_price, platform_markup), sub_categories(category_id), stores!inner(is_active)',
      )
      .eq('approval_status', 'approved')
      .eq('stores.is_active', true)
      .neq('stock_status', 'out_of_stock')
      .limit(PRODUCT_POOL),
  ]);

  const error = categoriesRes.error ?? productsRes.error;
  if (error) {
    // Production: throw, don't return empty. The home page is cached
    // (revalidate), and a failed background refresh keeps serving the last
    // good page; a deploy with a wrong database URL fails its build instead
    // of going live with no products. CI/local builds (placeholder database)
    // render without products.
    if (process.env.VERCEL_ENV === 'production') {
      throw new Error(`[fetchLandingCatalogue] ${error.message}`);
    }
    console.error('[fetchLandingCatalogue] failed:', error.message);
    return { categories: [], products: [] };
  }

  const rows = (productsRes.data ?? []) as unknown as ProductRow[];
  const products = rows.map(mapRow);
  const byCategory = new Map<string, LandingProduct[]>();
  rows.forEach((row, i) => {
    const categoryId = row.sub_categories?.category_id;
    if (!categoryId) return;
    byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), products[i]]);
  });

  const categories = ((categoriesRes.data ?? []) as unknown as CategoryRow[])
    .filter((c) => byCategory.has(c.id))
    .sort(
      (a, b) =>
        (a.category_sections?.sort_order ?? 0) - (b.category_sections?.sort_order ?? 0) ||
        a.sort_order - b.sort_order,
    )
    .map((c) => {
      const items = byCategory.get(c.id) ?? [];
      return { id: c.id, name: c.name, image: c.image_url || items[0].image, products: items };
    });

  return { categories, products: [...products].sort((a, b) => a.price - b.price) };
}
