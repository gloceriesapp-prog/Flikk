import type { Product } from '../screens/home/products/types';
import { shopIsOpen } from './storeOpening';

export function productAvailability(product: Product, date = new Date()) {
  const closed = product.storeOpening && !shopIsOpen(product.storeOpening, date);
  return {
    isAvailable: product.isAvailable !== false && !closed,
    label: product.isAvailable === false
      ? product.unavailableReason === 'stock_unconfirmed' ? 'Stock updating'
        : product.unavailableReason === 'product_unavailable' ? 'Unavailable' : 'Out of stock'
      : closed ? 'Shop closed' : undefined,
  };
}
