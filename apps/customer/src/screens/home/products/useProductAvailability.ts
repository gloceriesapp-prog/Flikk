import { productAvailability } from '../../../utils/productAvailability';
import type { Product } from './types';

export function useProductAvailability(product: Product) {
  return productAvailability(product);
}
