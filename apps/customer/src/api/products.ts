// Shared mapping from the backend's real product+variant+store rows
// (routes/stores.ts: /stores/products/deals, /stores/products/catalog,
// /stores/products/similar — same products.product_variants rows a founder
// writes via admin's Inventory screen, same stores row a founder writes via
// admin's Add Store form) to this app's own Product shape (screens/home/
// products/types.ts). One place so every product feed (Today's Steal
// Deals, Today's Stock, ProductDetailSheet's "you may also like", and
// whatever's added next) stays in sync instead of each hook inventing its
// own row->Product mapping. Not moved into packages/shared — only this app
// consumes it right now; extract there if/when apps/partner needs the same
// mapping (no premature sharing).

import type { Product } from '../screens/home/products/types';

export interface ApiVariant {
  id: string;
  unit_type: 'g' | 'kg' | 'ml' | 'l' | 'pc';
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
}

export interface ApiProduct {
  id: string;
  name: string;
  local_name: string | null;
  category: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  bg_color: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  product_variants: ApiVariant[];
  // Real FK, present on every row regardless of the stores join below —
  // what mapApiProduct's own storeId comes from (see that field's note in
  // types.ts).
  store_id: string;
  // Only present on feeds that join stores (all of routes/stores.ts's
  // product feeds do) — fssai_number/address_line/city are what
  // SellerDetailsCard needs, real columns a founder fills in on admin's Add
  // Store form (storeValidation.ts), not invented for this feed.
  stores: {
    name: string;
    fssai_number: string | null;
    address_line: string | null;
    city: string | null;
    photo_url: string | null;
  } | null;
}

const UNIT_LABEL: Record<ApiVariant['unit_type'], string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

function formatVariant(variant: ApiVariant): string {
  return `${variant.quantity} ${UNIT_LABEL[variant.unit_type]}`;
}

// TEMPORARY preview-only — same convention as store-detail's own
// dummyStoreCategories.ts: no real product on file yet has more than one
// product_variants row (a founder hasn't entered multi-size pricing via
// admin's Inventory screen for any real product), so ProductVariantOptions'
// card grid has never actually had real data to render. This synthesizes a
// second size from a real product's own real price/weight ONLY when the
// backend returned 0-1 real variants, purely so the UI can be previewed
// end-to-end. Delete this whole function (and its one call site below)
// once real multi-size products exist — real variants always win over it.
function withPreviewVariants(realVariants: ApiVariant[], basePrice: number, baseOriginalPrice: number | null): ApiVariant[] {
  if (realVariants.length > 1) return realVariants;
  const base = realVariants[0];
  const bulkPrice = Math.round(basePrice * 2.7);
  const bulkOriginal = baseOriginalPrice ? Math.round(baseOriginalPrice * 2.7) : null;
  return [
    base ?? { id: 'preview-base', unit_type: 'g', quantity: 500, price: basePrice, original_price: baseOriginalPrice, is_default: true },
    { id: 'preview-bulk', unit_type: base?.unit_type ?? 'g', quantity: (base?.quantity ?? 500) * 3, price: bulkPrice, original_price: bulkOriginal, is_default: false },
  ];
}

export function mapApiProduct(row: ApiProduct): Product {
  const variants = withPreviewVariants(
    [...row.product_variants].sort((a, b) => Number(b.is_default) - Number(a.is_default)),
    row.price,
    row.original_price,
  );
  const defaultVariant = variants[0];
  const store = row.stores;

  return {
    id: row.id,
    name: row.name,
    localName: row.local_name ?? '',
    weight: defaultVariant ? formatVariant(defaultVariant) : '',
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    // Not tracked on real products yet — no rating system exists
    // (CLAUDE.md's own out-of-scope list has no room for one either), so
    // these stay unused placeholders; ProductCardView never renders them.
    rating: 0,
    ratingCount: '',
    imageSeed: row.id,
    imageUrl: row.image_url ?? undefined,
    bgColor: row.bg_color ?? undefined,
    isVeg: row.is_veg,
    freshnessTag: row.freshness_tag ?? undefined,
    sizeOptions: variants.length > 0 ? variants.map(formatVariant) : undefined,
    // Only set when there's genuinely more than one real size to choose
    // between — ProductVariantOptions.tsx's own guard also checks this,
    // but not setting it here at all keeps a single-variant product's
    // Product object identical to how it looked before this field existed.
    variants:
      variants.length > 1
        ? variants.map((v) => ({ id: v.id, label: formatVariant(v), price: v.price, originalPrice: v.original_price ?? undefined }))
        : undefined,
    description: row.description ?? undefined,
    categoryLabel: row.category,
    storeId: row.store_id,
    storeName: store?.name,
    storePhotoUrl: store?.photo_url ?? undefined,
    // Only set when the store actually has an FSSAI number on file —
    // SellerDetailsCard's own guard (ProductDetailInfo.tsx) hides the whole
    // card rather than show a seller row with blank regulatory fields.
    sellerDetails:
      store?.fssai_number && store.name
        ? {
            name: store.name,
            fssaiNumber: store.fssai_number,
            address: [store.address_line, store.city].filter(Boolean).join(', '),
          }
        : undefined,
  };
}
