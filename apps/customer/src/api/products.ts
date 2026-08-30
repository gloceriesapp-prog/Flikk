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

export function mapApiProduct(row: ApiProduct): Product {
  const variants = [...row.product_variants].sort((a, b) => Number(b.is_default) - Number(a.is_default));
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
