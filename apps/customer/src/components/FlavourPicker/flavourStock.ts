import type { Product, ProductOption } from '../../screens/home/products/types';
import type { CartItem } from '../../store/useCartStore';
type Pack = { id?: string; availableQuantity?: number };
export function flavourAvailableQuantity(product: Product, option?: ProductOption, pack?: Pack): number | undefined {
  const counts = [product.totalAvailableQuantity, option?.availableQuantity, pack?.availableQuantity ?? (!pack || pack.id === product.defaultVariantId ? product.availableQuantity : undefined)]
    .filter((count): count is number => Number.isInteger(count) && count! >= 0);
  return counts.length ? Math.min(...counts) : undefined;
}
export function canAddFlavourPack(product: Product, option: ProductOption | undefined, pack: Pack, items: CartItem[], needed = 1): boolean {
  const lines = items.filter(item => item.productId === product.id);
  const total = (matches: (item: CartItem) => boolean) => lines.filter(matches).reduce((sum,item) => sum + item.quantity,0) + needed;
  return (product.totalAvailableQuantity == null || total(() => true) <= product.totalAvailableQuantity)
    && (pack.availableQuantity == null || total(item => item.variantId === pack.id) <= pack.availableQuantity)
    && (option?.availableQuantity == null || total(item => item.optionId === option.id) <= option.availableQuantity);
}
