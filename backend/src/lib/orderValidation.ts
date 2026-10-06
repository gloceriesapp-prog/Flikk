// Pure cart-validation logic for POST /orders. Extracted so it's testable without
// a live Supabase connection. Source: specs/00-foundation/api-conventions.md
// ("single-store-per-order enforced here, not just trusted from the client";
// "validate every item's stock at time of order").

export interface CartProduct {
  id: string;
  store_id: string;
  price: number;
  is_in_stock: boolean;
}

export interface CartItem {
  product_id: string;
  variant_id?: string | null;
  expected_unit_price?: number;
  quantity: number;
}

export class CartValidationError extends Error {
  constructor(
    public code: 'PRODUCT_NOT_FOUND' | 'MULTI_STORE_CART' | 'STOCK_UNAVAILABLE',
    message: string,
  ) {
    super(message);
  }
}

// Throws on the first violation found, in the order api-conventions.md lists them:
// existence -> single-store -> stock.
export function validateCart(items: CartItem[], products: CartProduct[], storeId: string): void {
  if (products.length !== new Set(items.map((item) => item.product_id)).size) {
    throw new CartValidationError('PRODUCT_NOT_FOUND', 'One or more items no longer exist.');
  }

  const distinctStores = new Set(products.map((p) => p.store_id));
  if (distinctStores.size > 1 || !distinctStores.has(storeId)) {
    throw new CartValidationError('MULTI_STORE_CART', 'All items must belong to the same store.');
  }

  const outOfStock = products.filter((p) => !p.is_in_stock);
  if (outOfStock.length > 0) {
    throw new CartValidationError(
      'STOCK_UNAVAILABLE',
      `Out of stock: ${outOfStock.map((p) => p.id).join(', ')}`,
    );
  }
}

// Same existence/stock checks as validateCart, minus the single-store rule
// — POST /trips (routes/trips.ts, lib/trips.ts) is the one caller allowed
// to accept a cart spanning more than one store, since it fans the items
// out into one real order per store rather than pretending they're all one
// order. Sharing this instead of duplicating the two checks is what keeps
// "a product that no longer exists" / "an out-of-stock product" caught the
// same way on both the single-store and multi-store checkout paths.
export function validateMultiStoreCart(items: CartItem[], products: CartProduct[]): void {
  if (products.length !== new Set(items.map((item) => item.product_id)).size) {
    throw new CartValidationError('PRODUCT_NOT_FOUND', 'One or more items no longer exist.');
  }

  const outOfStock = products.filter((p) => !p.is_in_stock);
  if (outOfStock.length > 0) {
    throw new CartValidationError(
      'STOCK_UNAVAILABLE',
      `Out of stock: ${outOfStock.map((p) => p.id).join(', ')}`,
    );
  }
}
