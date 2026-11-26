import { apiRequest } from './client';
import { mapApiProduct, type ApiProduct } from './products';
import type { Product } from '../screens/home/products/types';

// Public catalogue near the current location (no sign-in). Used by the dev
// Track Order preview for real sample items and their reorder. Kept out of
// api/products.ts, which stays free of the network client (backend tests
// import it).
export async function fetchPublicCatalogue(): Promise<Product[]> {
  return (await apiRequest<ApiProduct[]>('/stores/products/catalog', { auth: false })).map(mapApiProduct);
}
