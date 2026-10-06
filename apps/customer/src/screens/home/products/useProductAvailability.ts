import { useBrowseClock } from '../../../utils/useBrowseClock';
import { productAvailability } from '../../../utils/productAvailability';
import type { Product } from './types';

export function useProductAvailability(product: Product) {
  const timestamp = useBrowseClock();
  return productAvailability(product, new Date(timestamp));
}
