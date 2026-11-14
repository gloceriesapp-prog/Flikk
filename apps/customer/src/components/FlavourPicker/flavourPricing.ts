import type { Product, ProductOption } from '../../screens/home/products/types';

/** Only final, server-calculated customer prices enter the app/cart. */
export function flavourPrice(product: Product, option?: ProductOption, variant?: NonNullable<Product['variants']>[number]) {
  const price = option?.prices?.[variant?.id ?? product.defaultVariantId ?? 'base'];
  return price ?? { price: variant?.price ?? product.price, originalPrice: variant?.originalPrice ?? product.originalPrice, unitPriceLabel: variant?.unitPriceLabel ?? product.unitPriceLabel };
}
export function flavourPacks(product: Product) {
  return product.variants?.length ? product.variants : [{ id: product.defaultVariantId, label: product.weight,
    price: product.price, originalPrice: product.originalPrice, unitPriceLabel: product.unitPriceLabel, availableQuantity: product.availableQuantity, isAvailable: product.isAvailable }];
}
