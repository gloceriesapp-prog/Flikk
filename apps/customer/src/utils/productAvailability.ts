import type { Product } from '../screens/home/products/types';

// The cart is a draft: a closed shop does not prevent saving stocked items.
// Live shop hours and inventory are checked again by checkout on the server.
export function productAvailability(product: Product) {
  return {
    isAvailable: product.isAvailable !== false,
    label: product.isAvailable === false
      ? product.unavailableReason === 'stock_unconfirmed' ? 'Stock updating'
        : product.unavailableReason === 'product_unavailable' ? 'Unavailable' : 'Out of stock'
      : undefined,
  };
}
