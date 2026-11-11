import type { Product, ProductOption } from '../../screens/home/products/types';

// UI-only identity. Never sent as option_id: the original product is the
// existing base cart line, and added flavours keep their real database IDs.
export const MAIN_PRODUCT_CHOICE = 'main-product';
export function flavourChoices(product: Product): ProductOption[] {
  if (!product.options?.length) return [];
  return [{ id: MAIN_PRODUCT_CHOICE, name: product.name, imageUrl: product.imageUrl,
    imageUrls: product.imageUrls, isAvailable: product.isAvailable !== false }, ...product.options];
}
export function flavourPhotos(product: Product, selectedId: string): string[] {
  const option = product.options?.find((item) => item.id === selectedId);
  if (option?.imageUrls?.length) return option.imageUrls;
  if (option?.imageUrl) return [option.imageUrl];
  return product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
}
