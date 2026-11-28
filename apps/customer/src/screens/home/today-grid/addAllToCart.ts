// Usuals "add all": every listed product that can go straight in the cart
// (no size/flavour choice needed, available) is added once. Returns how many.
import { productAvailability } from '../../../utils/productAvailability';
import { cartLineId, quickAddCut, requiresProductSelection } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';
import type { Product } from '../products/types';

export function addAllToCart(products: Product[]): number {
  const cart = useCartStore.getState();
  let added = 0;
  for (const product of products) {
    if (requiresProductSelection(product) || !productAvailability(product).isAvailable || product.preorder) continue;
    const cutSize = quickAddCut(product);
    const id = cartLineId(product.id, product.defaultVariantId, cutSize);
    if (cart.items.some(item => item.id === id)) continue;
    cart.addItem({ isAvailable: true, id, productId: product.id, variantId: product.defaultVariantId, cutSize, name: product.name,
      weight: product.weight, price: product.price, originalPrice: product.originalPrice, storeId: product.storeId ?? '',
      storeName: product.storeName, imageUrl: product.imageUrl });
    added += 1;
  }
  return added;
}
