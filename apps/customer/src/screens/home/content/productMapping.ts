import { mapApiProduct, type ApiProduct } from '../../../api/products';
import type { Product } from '../products/types';

// All catalogue feeds share one database-only pack mapping.
export function mapContentProduct(row: ApiProduct): Product {
  return mapApiProduct(row);
}
