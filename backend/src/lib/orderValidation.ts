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
  if (products.length !== items.length) {
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
