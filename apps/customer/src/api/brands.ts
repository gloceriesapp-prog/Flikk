import { apiRequest } from './client';
import { mapApiProduct, type ApiProduct } from './products';

export interface PopularBrand {
  id: string;
  name: string;
  imageUrl: string;
  bannerUrl?: string | null;
}

interface BrandProductsPage {
  brand: { id: string; name: string; imageUrl: string | null; bannerUrl?: string | null };
  products: ApiProduct[];
  nextCursor: string | null;
}

export function fetchPopularBrands(signal: AbortSignal) {
  return apiRequest<PopularBrand[]>('/categories/popular-brands', { auth: false, signal });
}

export async function fetchBrandProducts(brandId: string, cursor: string | null, signal: AbortSignal) {
  const after = cursor ? '?after=' + encodeURIComponent(cursor) : '';
  const page = await apiRequest<BrandProductsPage>('/browse/brand/' + encodeURIComponent(brandId) + after, { auth: false, signal });
  return { ...page, products: page.products.map(mapApiProduct) };
}

export function fetchAllPopularBrands(cursor: string | null, signal: AbortSignal) {
  const after = cursor ? '?after=' + encodeURIComponent(cursor) : '';
  return apiRequest<{ brands: PopularBrand[]; nextCursor: string | null }>(
    '/categories/popular-brands/all' + after, { auth: false, signal });
}
