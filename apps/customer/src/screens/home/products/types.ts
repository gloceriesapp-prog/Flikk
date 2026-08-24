// Shared shape for every product card on Home — Fresh Fish, Today's Steal
// Deals, Everyday essentials, Coastal Kitchen picks all use this, not their
// own copy. See ProductCard.tsx.

export interface Product {
  id: string;
  name: string;
  localName: string;
  weight: string;
  price: number;
  originalPrice?: number;
  rating: number;
  ratingCount: string;
  imageSeed: string;
  // Real uploaded photo (products.image_url, set via admin's Inventory —
  // see apps/admin/src/lib/supabase/products.ts) — falls back to the
  // shared placeholder image (imageSeed) when a product has none yet.
  imageUrl?: string;
  // Pastel color extracted from imageUrl at upload time (admin's
  // lib/bgColor.ts, products.bg_color) — the card's own image tile
  // background, so a no-background product photo sits on a color pulled
  // from itself instead of a flat mismatched box. Falls back to the
  // --mist token when unset (mock products, or real ones from before this
  // column existed).
  bgColor?: string;
  // Optional, defaults to true in ProductCard — most of a kirana grocery
  // catalog is veg by default, only fish/meat entries need to set this
  // explicitly false, rather than touching every other data.ts file.
  isVeg?: boolean;
  // Only set on same-day-only perishables (dairy, etc.) — a ribbon badge,
  // not present on shelf-stable goods where it'd be meaningless.
  freshnessTag?: string;
  // ProductDetailSheet-only fields — all optional, the sheet hides the
  // rows that need them (breadcrumb link, description paragraph, seller
  // row, replacement-policy row) rather than showing an empty gap when a
  // data.ts entry doesn't set them.
  description?: string;
  categoryLabel?: string;
  // Seller/store this listing belongs to — display only, no storeId to
  // navigate with yet (Product isn't linked to store-list/'s Store type).
  storeName?: string;
  // Real storefront photo (stores.photo_url, set via admin's Add Store form
  // -> ProductImageUpload with bucket="store-images", a separate Storage
  // bucket from product photos — see backend/src/routes/stores.ts's own
  // note on why). ProductDetailInfo's seller row falls back to the shared
  // placeholder image when a store has none.
  storePhotoUrl?: string;
  replacementPolicy?: string;
  // Estimated minutes to delivery — CLAUDE.md's own status-only tracking
  // rule (no live GPS/ETA math) means this is a store-set expectation, not
  // a computed live estimate.
  deliveryEtaMinutes?: number;
  // Pack-size chips on ProductDetailSheet (e.g. ['250 g', '1 kg']) — UI
  // selection only, doesn't change price/weight below it yet (no
  // per-size pricing model exists on Product, just the one price/weight
  // pair). Falls back to a single non-interactive chip showing `weight`
  // when unset, so products without explicit options still show
  // something instead of an empty row.
  sizeOptions?: string[];
  // Regulatory/seller info block on ProductDetailSheet (SellerDetailsCard) —
  // FSSAI license display is a real requirement for Indian grocery/food
  // listings, not decorative. Optional since most placeholder data doesn't
  // carry it yet.
  sellerDetails?: {
    name: string;
    fssaiNumber: string;
    address: string;
  };
  // "Similar products" horizontal row on ProductDetailSheet
  // (SimilarProductsRow) — a flat list of other Products to show, not a
  // computed recommendation. Optional; most data.ts entries won't set it.
  relatedProducts?: Product[];
}
